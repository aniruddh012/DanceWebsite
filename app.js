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
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "your email", // generated ethereal user
      pass: "your password", // generated ethereal password
    },
  });

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

app.get('/',async (req,res)=>{
    let logintoken = await req.cookies.dslogin;
    if (logintoken) {
        let user = await Users.findOne({"tokens.token" : logintoken});
        res.status(200).render('home', {
            username:user.firstname,
            userid:user._id,
            actionurl:"logout",
            actionname:"Logout"
        });
    } else {
        res.status(200).render('home',{
            actionurl:"login",
            actionname:"Login"
        });
    }
})
app.get('/contact',async (req,res)=>{
    let logintoken = await req.cookies.dslogin;
    if (logintoken) {
        let user = await Users.findOne({"tokens.token" : logintoken});
        res.status(200).render('./contact', {
            username:user.firstname,
            userid:user._id,
            actionurl:"logout",
            actionname:"Logout"
        });
    } else {
    res.status(200).render('./contact', {
        actionurl:"login",
        actionname:"Login"
    });
    }
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
                const token = await user.generateAuthToken();
                var mailOptions = await {
                    from : 'aniruddhyadavhunter@gmail.com',
                    to : user.email,
                    subject : `Verify your email`,
                    text : `Please verify your email to create an account by this link http://localhost/login?token=${token}`
                };
                transporter.sendMail(mailOptions, await function(error,info){
                    if (error){
                        console.log(error);
                    }
                    else{
                        console.log("email sent: " + info.response);
                    }
                });
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
    let token = await req.query.token;
    let loginuser = await Users.findOne({"tokens.token": token})
    if (token && loginuser){
        await Users.updateOne({"tokens.token":token}, {$set:{tokens:[],status:"active"}});       
        await res.status(200).render('./login', {
             message: "Your Account has been created successfully, Please Login to continue"
        })
    }
    else{
        res.status(200).render('./login');
    }
})
app.post('/login', async function(req,res){
    let loginpassword = req.body.password;
    console.log(loginpassword)
    let user = await Users.findOne({"email":req.body.email})
    let status = await user.status;
    console.log(user.password,status)
    await bcrypt.compare(req.body.password, user.password, async (err, isValid)=>{
        if (isValid) {
            let token = await user.generateAuthToken();
            res.cookie('dslogin', token, {
                expire: new Date(Date.now()+1000*60*60*24*28),
                httpOnly:true
            })
            await user.save().then(()=>{
                res.status(200).redirect('/');
                }).catch((error)=>{
                    res.status(400).render('./login',{
                    message:"Sorry Something wrong here"
                    })
                })
        }
        if (err) {
            res.status(400).render('./login',{
            message:"Invalid login details"
        })
        }
        if (!isValid) {
            console.log(!isValid)
            res.status(400).render('./login',{
            message:"Invalid login details"
        })
        }
    });
})


app.get('/logout', async (req,res)=>{
    let logoutToken = await req.cookies.dslogin;
    let logoutuser = await Users.findOne({"tokens.token":logoutToken});
    logoutuser.tokens = await logoutuser.tokens.filter(elem =>{
        return elem.token != logoutToken;
    });
    await logoutuser.save().then(()=>{
        res.clearCookie('dslogin');
        res.status(200).redirect('/');
        }).catch(()=>{
            console.log("Sorry something went wrong here")
    })
    
})


app.listen(port, ()=>{
    console.log('server is running on port 80')
})
