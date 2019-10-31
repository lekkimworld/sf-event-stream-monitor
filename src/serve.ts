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

// read env variables from .env
dotenv.config();

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

// listen
console.log(`Listening on ${process.env.PORT || 8080}`);
app.listen(process.env.PORT || 8080);
