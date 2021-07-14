const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/danceContacts', {useNewUrlParser: true, useUnifiedTopology: true});
const port = 80;
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    address: String,
    more: String
  });
const Contact = mongoose.model('Contact', contactSchema);

app.use('/static', express.static('static'));
app.use(express.urlencoded());

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'));

app.get('/',(req,res)=>{
    res.status(200).render('home');
})
app.get('/contact',(req,res)=>{
    res.status(200).render('./contact');
})
app.post('/contact',(req,res)=>{
    var myData = new Contact(req.body);
    console.log(req.name)
    myData.save().then(()=>{
        res.send('This item has been saved to the database')
        }).catch(()=>{
        res.status(400).send("item was not saved to the databse")
    })
})

app.listen(port, ()=>{
    console.log('server is running on port 80')
})