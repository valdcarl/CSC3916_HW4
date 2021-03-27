/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */

let envPath = __dirname + "/.env"
require('dotenv').config({path:envPath});
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

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
                if (err.code == 11000)
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
router.route('/movies')
    //we need to be able to save a movie to our mongodb 'movies' collection
    .post(authJwtController.isAuthenticated, function (req, res) {
        if (!req.body.title || !req.body.releaseYear || !req.body.genre || !req.body.actors) {
            res.json({success: false, msg: 'You must include all criteria requested to input a movie.'})
        }
        else {
            if (req.body.actors.length < 3) {
                // there must be 3 actors per movie
                res.json({success: false, msg: 'You must include 3 or more actors.'})
            } else {
                let newMovie  = new Movie();
                newMovie.title = req.body.title;
                newMovie.releaseYear = req.body.releaseYear;
                newMovie.genre = req.body.genre;
                newMovie.actors = req.body.actors;

                newMovie.save(function(err) {
                    if (err) {
                        if (err.code == 11000)
                            return res.json({success: false, msg: 'That movie title already exists.'});
                        else
                            return res.json(err);

                    }

                    res.json({success: true, msg: 'Movie successfully saved.'})
                })
            }
        }
    })
    .get(authJwtController.isAuthenticated, function(req, res) {
        //we need to be able to return all of the movies in the collection
        Movie.find(function(err, movies) {
            if (err) {
               return res.json(err);
            } else {
                res.json(movies);
            }
        });
    })
    .put(authJwtController.isAuthenticated, function(req, res) {
        //we need to be able to update movies as well
        //lets find the movies by title
        if (!req.body.title) {
            return res.json({success: false, msg: 'That title does not exist, try again with applicable title.'})
        }
        else {
            Movie.findOne({title: req.body.title}).exec(function (err, movie) {
                if (err) {
                    res.send(err);
                }
                else {
                    if (movie) {
                        if(req.body.releaseYear){
                            movie.year = req.body.releaseYear;
                        }
                        if(req.body.genre){
                            movie.genre = req.body.genre;
                        }
                        if(req.body.actors){
                            //check if user input at least 3 actors again
                            if(req.body.actors.length < 3){
                                return res.json({success: false, msg: 'You must include 3 or more actors.'})
                            }// otherwise we are good
                            movie.actors = req.body.actors;
                        }

                        movie.save(function (err) {
                            if (err) {
                                return res.json(err);
                            }
                            res.json({success: true, msg: 'Movie has been updated.'})
                        })
                    }
                    else {
                        return res.json({success: false, msg: 'That title does not exist, cannot update.'})
                    }
                }
            });
        }
    })
    .delete(authJwtController.isAuthenticated, function(req, res) {
        // we need to be able to delete a movie from the collection as well
        if (!req.body.title){
            return res.json({success: false, msg: 'That title does not exist, try again with applicable title to delete.'})
        } else {
            Movie.findOneAndDelete({title: req.body.title}, function(err, movie) {
                if (err) {
                    res.send(err);
                } else if(!movie) {
                    return res.json({success: false, msg: 'That title does not exist.'})
                } else {
                    return res.json({success: true, msg: 'Movie successfully deleted.'})
                }
            });
        }
    });

// reviews
router.route('/reviews').post(authJwtController.isAuthenticated, function (req, res) {
    Movie.findOne({Title: req.body.movieTitle}).exec(function(err, movie) {
        if (err) res.send(err);
        // if the movie with reviews already exists, just add new reviews
        if (movie !== null) {
            var newReview = new Review();
            newReview.movieTitle = req.body.movieTitle;
            newReview.reviewer = req.body.reviewer;
            newReview.quote = req.body.quote;
            newReview.rating = req.body.rating;
            newReview.save(function (err) {
                if (err) {
                    return res.send({success: false, msg: "Failed to create a movie review"});
                }
                res.json({msg: 'Review has been successfully created!'});
            });
        }
        else
        {
            res.json({msg: "Movie with that particular title not found!"});

        }
    });
});
router.route('/reviews')
    .get(authJwtController.isAuthenticated, function (req, res) {
        if (req.query.reviews === 'true') {
            Movie.aggregate([
                {
                    $lookup:
                        {
                            from: 'reviews',
                            localField: 'Title',
                            foreignField: 'MovieTitle',
                            as: 'Reviews'
                        }
                }
            ]). exec((err, movie) => {
                if (err) res.json({msg: "failed to get the reviews"});
            res.json(movie);
        });
        }
        else
        {
            res.json({message: "Please send a response with the query parameter ture"});
        }
    });

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


