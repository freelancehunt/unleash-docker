'use strict';

const unleash = require('unleash-server');
const passport = require('@passport-next/passport');
const GoogleOAuth2Strategy = require('@passport-next/passport-google-oauth2').Strategy;

const API_KEY = process.env.API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const GOOGLE_ALLOWED_DOMAIN = process.env.GOOGLE_ALLOWED_DOMAIN;

passport.use(
    new GoogleOAuth2Strategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: GOOGLE_CALLBACK_URL,
        },
        function (accessToken, refreshToken, profile, cb) {
            // Extract the minimal profile information we need from the profile object
            // and connect with Unleash to get name and email.
            console.log(profile);
            cb(
                null,
                new unleash.User({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                }),
            );
        },
    ),
);

// https://docs.getunleash.io/docs/deploy/securing_unleash
let options = {
    enableLegacyRoutes: false,
    adminAuthentication: 'custom',
    preRouterHook: app => {
        app.use(passport.initialize());
        app.use(passport.session());
        passport.serializeUser((user, done) => done(null, user));
        passport.deserializeUser((user, done) => done(null, user));

        app.get(
            '/api/admin/login',
            passport.authenticate('google', {
                    scope: ['email'],
                    hostedDomain: GOOGLE_ALLOWED_DOMAIN,
                }
            ),
        );

        app.get(
            '/api/auth/callback',
            passport.authenticate('google', {
                failureRedirect: '/api/admin/error-login',
            }),
            (req, res) => {
                res.redirect('/');
            },
        );

        app.use(
            '/api/admin/',
            (req, res, next) => {
                if (req.user) {
                    next();
                } else {
                    return res
                        .status('401')
                        .json(
                            new unleash.AuthenticationRequired({
                                path: '/api/admin/login',
                                type: 'custom',
                                message: `You have to identify yourself in order to use Unleash. Click the button and follow the instructions.`,
                            }),
                        )
                        .end();
                }
            });

        app.use('/api/client', (req, res, next) => {
            if (req.header('authorization') !== API_KEY) {
                res.sendStatus(401);
            } else {
                next();
            }
        });
    },
};

unleash.start(options);
