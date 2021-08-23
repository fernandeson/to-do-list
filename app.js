const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require('lodash');

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

// ------ MONGOOSE
mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser: true});

const itemsSchema = new mongoose.Schema({
    name: String
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
    name: "This is a ToDoList."
});

const item2 = new Item({
    name: "Hit the '+' button to add new item."
});

const item3 = new Item({
    name: "<-- Check the box to delete item."
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

// ------ SERVER
app.get("/", (req, res) => {
    // fecth items found in Items collection:
    Item.find({}, (err, result)=>{
        if (err) {
            console.log("err-find", err.message, err.stack)
        } else {
            // add default items
            if (result.length === 0) {
                Item.insertMany(defaultItems, (err) => {
                    if (err) {
                        console.log("err-insertMany", err.message, err.stack)
                    } else {
                        console.log("successfully saved default items to DB");
                    };
                });
                res.redirect("/");
            } else {
                // render to EJS template:
                res.render('list', { listTitle: "Today", newListItems: result });
            }
        };
    });  
});

app.post("/", (req, res) => {
    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({
        name: itemName
    });

    if (listName === "Today") {
        item.save();
        res.redirect("/");
    } else {
        List.findOne({name: listName}, (err, result) => {
            if (err) {
                console.log("err", err.message, err.stack);
            } else {
                result.items.push(item);
                result.save();
                res.redirect("/" + listName);
            }
        });
    }
});

app.post("/delete", (req, res) => {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;
    if (listName === "Today") {
        Item.findByIdAndRemove(checkedItemId, (err) => {
            if (err) { console.log("err", err.message, err.stack) }
        });
        setTimeout(()=>{ res.redirect("/"); }, 300);
    } else {
        List.findOne({name: listName}, (err, result) => {
            if (err) {
                console.log("err", err.message, err.stack);
            } else {
                List.findOneAndUpdate(
                    {name: listName},
                    {$pull: {items: {_id: checkedItemId}}},
                    (err, result) => {
                        if (err) { 
                            console.log("err", err.message, err.stack) 
                        } else { 
                            setTimeout(()=>{ res.redirect("/" + listName); }, 300); 
                        }
                    }
                )
                
            }
        });
    }

});

app.get("/:customListName", (req, res) => {
    const customListName = _.capitalize(req.params.customListName);
    List.findOne({name: customListName}, (err, result) => {
        if (err) { 
            console.log("err-customList", err.message, err.stack);
        } else {
            if (result == null) {
                // Create a new list
                const list = new List({
                    name: customListName,
                    items: defaultItems
                });
                list.save();
                res.redirect('/' + customListName);
            } else {
                //Show existing list
                res.render("list", {listTitle: result.name, newListItems: result.items})
            }
        }
    });
});


app.listen(3000, ()=>{
    console.log("server running on port 3000");
});
