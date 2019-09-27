import express from "express";
import passport from "passport";
//@ts-ignore
import {Strategy} from "passport-salesforce-oauth2";
import * as dotenv from "dotenv";
import exphbs from "express-handlebars";
import ensureLogin from "connect-ensure-login";

// read env variables from .env
dotenv.config();

// create app
const app = express();

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

app.get("/oauth/callback", passport.authenticate('salesforce', { failureRedirect: '/login' }), (req, res) => {
	res.redirect('/');
});

app.get("/", ensureLogin.ensureLoggedIn(), (req, res) => {
    return res.render("root");
});

// listen
app.listen(process.env.PORT || 8080);
