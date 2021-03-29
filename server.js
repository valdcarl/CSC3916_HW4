/*
 CSC3916
 File: server.js
 Description: Web API : Movie API
*/
let envPath = __dirname + "/.env"
require('dotenv').config({path:envPath});

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie =require('./Movies');
var Reviews = require('./Review');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

// signup
router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code === 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

// signin
router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

// movies
router.route('/Movies')
    .delete(authJwtController.isAuthenticated, function(req, res){
        if(!req.body.title){
            res.status(403).json({success:false, message: "Please provide a movie to be delete."});
        }
        else{
            Movie.findOneAndDelete({title:req.body.title}, function(err, movie){
                if (movie){
                    res.status(200).json({success: true, message: "Found the movie!", Movie: movie});
                }
                else {
                    res.status(404).json({success:false, message: "Movie was not found!"});
                }
            })
        }
    })
    .put(authJwtController.isAuthenticated, function(req, res) {
        if(!req.body.title|| !req.body.new.title){
            res.status(403).json({SUCCESS:false, message: "Please provide a movie title to be updated along with the new title"})
        }
        else{
            Movie.findOneAndUpdate({title:req.body.title}, {title :req.body.new.title}, function(err, movie){
                if (movie) {
                    res.status(200).json({success: true, message: "Found Movie"})
                }
                else {
                    res.status(404).json({success: false, message: "Movie not found"});
                }
            })
        }
    })
    .get(authJwtController.isAuthenticated,function(req, res) {
        if(!req.body){
            res.status(403).json({SUCCESS:false, message: "Please provide a movie to display"})
        }
        else{
            Movie.find({title:req.body.title}).select("title year genre actorsName").exec(function(err, movie){
                if (movie) {
                    res.status(200).json({success: true, message: "Success! The Movie was found", Movie: movie})
                }
                else {
                    res.status(404).json({success: false, message: "Movie not found"});
                }
            })
        }
    })
    .post(authJwtController.isAuthenticated,function(req, res) {
        if(!req.body.title || !req.body.year || !req.body.genre || !req.body.actorsName[0] || !req.body.actorsName[1] || !req.body.actorsName[2]) {
            res.status(403).json({SUCCESS:false, message: "Error. Incorrect format "});
        }
        else{
            var movie = new Movie();
            movie.title = req.body.title;
            movie.year = req.body.year;
            movie.genre = req.body.genre;
            movie.actorsName = req.body.actorsName;

            movie.save(function(err){
                if (err){
                    if(err.code === 11000)
                        return res.json({SUCCESS:false, MESSAGE: "Error. Movie already exists"});
                    else
                        return res.json(err);
                }
            })
            res.json({SUCCESS:true, MESSAGE: "Movie Is Created."})
        }
    })

// reviews
router.route('/Review')
    .get(function(req, res) {
        if(!req.body.title){
            res.json({SUCCESS:false, message: "Please provide a review to display"})
        }
        else if(req.query.Review === "true"){
            Movie.findOne({title:req.body.title}, function(err, movie) {
                if (err) {
                    res.json({success: false, message: "Error! The review was not found"})
                }
                else{
                    Movie.aggregate([{
                        $match: {title: req.body.title}
                    },
                        {
                            $lookup: {
                                from: "reviews",
                                localField: "title",
                                foreignField: "title",
                                as: "movieReview"
                            }
                        }]).exec(function (err, movie) {
                        if (err) {
                            return res.json(err);
                        } else {
                            return res.json(movie);
                        }
                    })
                }
            })
        }
    })
    .post(authJwtController.isAuthenticated,function(req, res) {
        if(!req.body.title || !req.body.reviewer || !req.body.quote || !req.body.rating) {
            res.status(403).json({SUCCESS:false, message: "Error. Incorrect format"});
        }
        else{
            var review = new Reviews();
            review.title = req.body.title;
            review.reviewer = req.body.reviewer;
            review.quote = req.body.quote;
            review.rating = req.body.rating;

            review.save(function(err){
                if (err){
                    if(err.code === 11000)
                        return res.json({SUCCESS:false, MESSAGE: "Error. Review already exists"});
                    else
                        return res.json(err);
                }
            })
            res.json({SUCCESS:true, MESSAGE: "Review Is Created."})
        }
    })

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only