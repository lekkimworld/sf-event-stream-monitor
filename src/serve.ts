import express from "express";
import passport from "passport";
//@ts-ignore
import {Strategy} from "passport-salesforce-oauth2";
import * as dotenv from "dotenv";
import exphbs from "express-handlebars";
import ensureLogin from "connect-ensure-login";
import session from "express-session";
import bodyParser from "body-parser";
import * as path from 'path';
import http from "http";
//@ts-ignore
import * as websocket from "./websocket.js";
import * as jsforce from "jsforce";
import uuid from "uuid/v1";
import * as stringFormat from "string-format";

// read env variables from .env
dotenv.config();
stringFormat.extend(String.prototype, {});

// create app
const app = express();
app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat', 
    resave: true, 
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(express.static(path.join(__dirname, "..", "public")))

// configure express for authentication using salesforce
app.use(passport.initialize());
passport.use(new Strategy({
    "clientID": process.env.SF_CLIENT_ID,
    "clientSecret": process.env.SF_CLIENT_SECRET,
    "callbackURL": process.env.SF_CALLBACK_URL
}, (accessToken : string, refreshToken : string, profile : object, done : (err:Error|undefined, profile:object|undefined) => {}) => {
	//@ts-ignore
	profile.oauth = {
		"accessToken": accessToken
	}
    done(undefined, profile);
}));
passport.serializeUser((user, cb) => {
    cb(null, user);
});
passport.deserializeUser((obj, cb) => {
    cb(null, obj);
});
app.use(passport.session());

// configure handlebars
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.get('/login', passport.authenticate('salesforce'));

app.get('/logout', (req, res) => {
    const callback = (err:Error|undefined) => {

    }
    if (req.session) {
        req.session.destroy(callback);
    }
    res.redirect("/");
});

app.get("/oauth/callback", passport.authenticate('salesforce', { failureRedirect: '/login' }), (req, res) => {
	res.redirect('/home');
});

app.get("/", (req, res) => {
    return res.render("root");
});

app.get("/home", ensureLogin.ensureLoggedIn(), (req, res) => {
    return res.render("home", {"user": req.user});
});

app.get("/api/events", ensureLogin.ensureLoggedIn(), (req, res) => {
	// get websockt and initialize stream
	const wsController = websocket.getInstance();
	const stream = wsController.initializeStream();

	// listen to topic and stream data to websocket
	let number = 0;
	//@ts-ignore
	const conn = new jsforce.Connection({
		//@ts-ignore
		"accessToken": req.user.oauth.accessToken,
		"instanceUrl": "https://eu25.salesforce.com"
	});
	
	const streams = {
        "/event/LoginEventStream": {
            "replayId": -1,
            "pattern": "At {payload.EventDate} {payload.Username} ({payload.UserId}) logged IN with a {payload.SessionLevel} session using {payload.Browser}"
        },
        "/event/LogoutEventStream": {
            "replayId": -1,
            "pattern": "At {payload.EventDate} {payload.Username} ({payload.UserId}) logged OUT"
        },
        "/event/LightningUriEventStream": {
            "replayId": -1,
            "pattern": "At {payload.EventDate} {payload.Username} ({payload.UserId}) opened record w/ ID: {payload.RecordId}"
        },
        "/event/ListViewEventStream": true
    }
    Object.keys(streams).forEach(key => {
		const obj : object = (() => {
            if (typeof streams[key] === "object") return streams[key];
            return {
                "replayId": -1,
                "pattern": `At {payload.EventDate} {payload.Username} ({payload.UserId}) did something that caused an event in ${key}`
            }
		})()
		
		//@ts-ignore
		conn.streaming.topic(key).subscribe((msg:jsforce.StreamingMessage) => {
            //@ts-ignore
			stream.write({"index": uuid(), "msg": obj.pattern.format(msg), "attributes": msg.payload});
        })
    })

	// return to caller
	res.type("json");
	return res.send({"status": "success"});
})

// listen
const port = process.env.PORT || 8080;
const httpServer = http.createServer(app);
websocket.createInstance(httpServer);
httpServer.listen(port);
console.log(`Listening on port ${port}`);
