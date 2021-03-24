/* eslint-disable import/no-extraneous-dependencies */

'use strict';

/**
 * Google OAuth 2.0
 *
 * You should read Using OAuth 2.0 to Access Google APIs:
 * https://developers.google.com/identity/protocols/OAuth2
 *
 * This example assumes that all users authenticating via
 * google should have access. You would probably limit access
 * to users you trust.
 *
 * The implementation assumes the following environment variables:
 *
 *  - GOOGLE_CLIENT_ID
 *  - GOOGLE_CLIENT_SECRET
 *  - GOOGLE_CALLBACK_URL
 *  - GOOGLE_ALLOWED_DOMAIN
 */

const passport = require('@passport-next/passport');
const GoogleOAuth2Strategy = require('@passport-next/passport-google-oauth2').Strategy;

const {AuthenticationRequired} = require('unleash-server');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const GOOGLE_ALLOWED_DOMAIN = process.env.GOOGLE_ALLOWED_DOMAIN;
const API_KEY = process.env.API_KEY;

function enableGoogleOauth(app, config, services) {
    const {baseUriPath} = config.server;
    const {userService} = services;

    passport.use(
        new GoogleOAuth2Strategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: GOOGLE_CALLBACK_URL,
            },

            async (accessToken, refreshToken, profile, done) => {
                const email = profile.emails[0].value;
                const user = await userService.loginUserWithoutPassword(email, true);
                done(
                    null,
                    user
                );
            },
        ),
    );

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));
    app.get(
        '/api/admin/login',
        passport.authenticate('google', {
            scope: ['email'],
            hostedDomain: GOOGLE_ALLOWED_DOMAIN,
        }),
    );

    app.get(
        '/api/auth/callback',
        passport.authenticate('google', {
            failureRedirect: '/api/admin/error-login',
        }),
        (req, res) => {
            // Successful authentication, redirect to your app.
            res.redirect('/');
        },
    );

    app.use('/api/admin/', (req, res, next) => {
        if (req.user) {
            return next();
        }
        // Instruct unleash-frontend to pop-up auth dialog
        return res
            .status('401')
            .json(
                new AuthenticationRequired({
                    path: '/api/admin/login',
                    type: 'custom',
                    message: `You have to identify yourself in order to use Unleash. 
                        Click the button and follow the instructions.`,
                }),
            )
            .end();
    });

    // TODO migrate to https://docs.getunleash.io/user_guide/api-token
    app.use('/api/client', (req, res, next) => {
        if (req.header('authorization') !== API_KEY) {
            res.sendStatus(401);
        } else {
            next();
        }
    });
}

module.exports = enableGoogleOauth;