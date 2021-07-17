const express = require('express');
const app = express();
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/danceSite', {useNewUrlParser: true, useUnifiedTopology: true});
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const port = 80;

// Configuring nodemailer to send emails
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth:{
//         user: 'aniruddhyadavhunter@gmail.com',
//         pass: 'Aniruddh012#'
//     }
// });

// Contact form configuration and data saving to database

const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    address: String,
    more: String
  });
const Contact = mongoose.model('Contact', contactSchema);

app.post('/contact',(req,res)=>{
    var myData = new Contact(req.body);
    console.log(req.name)
    myData.save().then(()=>{
        res.send('This item has been saved to the database')
        }).catch(()=>{
        res.status(400).send("item was not saved to the databse")
    })
})

// Contact form ends here

app.use('/static', express.static('static'));
app.use(express.urlencoded());
app.use(cookieParser());

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'));

app.get('/',(req,res)=>{
    res.status(200).render('home');
})
app.get('/contact',(req,res)=>{
    res.status(200).render('./contact');
})
app.get('/signup',(req,res)=>{
    res.status(200).render('./signup');
})


// creating userSchema and saving users data to the database

const userSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    email: String,
    phone: String,
    password:String,
    status: String,
    tokens:[{
        token:{
            type:String
        }
    }]
  });

  userSchema.methods.generateAuthToken = async function(){
      const token = await jwt.sign({_id:this._id}, "aniruddhyadavofficial");
      console.log(token);
      this.tokens = this.tokens.concat({token});
      return token;
  }
  userSchema.pre('save', async function(next){
    this.password = await bcrypt.hash(this.password, 10);
     next();
  })

const Users = mongoose.model('Users', userSchema);

app.post('/signup', async function(req,res){
    try {
        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;
        var email = req.body.email;
        const alreadyUser = await Users.findOne({email});
        if(req.body.firstname == '' || req.body.lastname == '' || email == '' || password == '' || confirmPassword == ''){
            res.status(400).render('./signup', {
                message: "required fields can't be empty, Please provide complete details"
            })
        }
        else if(alreadyUser){
            res.status(400).render('./signup', {
                message: "this email has already been registered, Please login to continue"
            })
        }
        else if (password===confirmPassword){
                var user = new Users({
                    firstname: req.body.firstname,
                    lastname:req.body.lastname,
                    email:req.body.email,
                    phone:req.body.phone,
                    password:req.body.password,
                    status: "pending"
                });
                console.log(user)
                const token = await user.generateAuthToken();
                // var mailOptions = await {
                //     from : 'aniruddhyadavofficial@gmail.com',
                //     to : user.email,
                //     subject : `Verify your email`,
                //     text : `Please verify your email to create an account by this link <a href="http://localhost/login?token=${token}">http://localhost/login?token=${token}</a>`
                // };
                // transporter.sendMail(mailOptions, await function(error,info){
                //     if (error){
                //         console.log(error);
                //     }
                //     else{
                //         console.log("email sent: " + info.response);
                //     }
                // });
                await user.save().then(()=>{
                    res.status(200).render('./signup', {
                        message: "We have sent an email to you, Please verify your email to successfully create an account"
                    })
                    }).catch(()=>{
                        res.status(400).render('./signup', {
                            message: "Sorry, something wrong here"
                        })
                })
        } else {
            res.status(400).render('./signup', {
                message: "both passwords are not matching"
            })
        }
    } catch (error) {
        res.status(400).render('./signup', {
            message: "Sorry, something wrong here"
        })
    }

})

// Signup form ends here and login form starts here

app.get('/login', async function(req,res){
    let stoken = req.query.token;
    if (stoken){
        Users.update({token:stoken}, {$set:{ status:"active"}});       
        res.status(200).render('./login', {
             message: "Your Account has been created successfully, Please Login to continue"
        })
    }
    else{
        res.status(200).render('./login');
    }
})



app.listen(port, ()=>{
    console.log('server is running on port 80')
})