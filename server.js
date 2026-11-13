const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(express.json());

app.use(session({
    secret: "surveysecret",
    resave: false,
    saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "../frontend")));


// MongoDB Connection

mongoose.connect("mongodb://127.0.0.1:27017/OnlineSurvey")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));


// User Schema

const User = mongoose.model("User", {
    username: { type: String, unique: true },
    password: String
});


// Question Schema

const Question = mongoose.model("Question", {
    questionId: { type: String, unique: true },
    question: String,
    options: [String],
    answer: String
});


// Submission Schema

const Submission = mongoose.model("Submission", {
    user: String,
    answers: Array,
    score: Number,
    correct: Number,
    wrong: Number,
    date: { type: Date, default: Date.now }
});


// EXACTLY FIVE QUESTIONS

const questions = [

    {
        questionId: "Q1",
        question: "Which language is used to create web pages?",
        options: ["HTML", "Python", "C", "Java"],
        answer: "HTML"
    },

    {
        questionId: "Q2",
        question: "Which database is used in this application?",
        options: ["MySQL", "MongoDB", "Oracle", "SQLite"],
        answer: "MongoDB"
    },

    {
        questionId: "Q3",
        question: "Which language is used to style web pages?",
        options: ["Java", "CSS", "Python", "C"],
        answer: "CSS"
    },

    {
        questionId: "Q4",
        question: "Which runtime environment executes JavaScript?",
        options: ["Node.js", "HTML", "CSS", "SQL"],
        answer: "Node.js"
    },

    {
        questionId: "Q5",
        question: "Which HTML element creates a hyperlink?",
        options: ["Paragraph", "Heading", "Anchor", "Break"],
        answer: "Anchor"
    }

];


// Store Exactly Five Questions

async function addQuestions() {

    await Question.deleteMany({});

    await Question.insertMany(questions);

    console.log("Exactly 5 Questions Added Successfully");
}


// Registration

app.post("/register", async (req, res) => {

    try {

        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({ message: "Enter all details" });
        }

        const existing = await User.findOne({ username });

        if (existing) {
            return res.json({ message: "Username Already Exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            password: hashedPassword
        });

        res.json({ message: "Registration Successful" });

    }
    catch (err) {
        res.status(500).json({ message: "Registration Error" });
    }

});


// Login

app.post("/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.json({ message: "Invalid Username or Password" });
        }

        req.session.username = username;

        res.json({ message: "Login Successful" });

    }
    catch (err) {
        res.status(500).json({ message: "Login Error" });
    }

});


// Login Verification

function checkLogin(req, res, next) {

    if (!req.session.username) {
        return res.status(401).json({ message: "Please Login First" });
    }

    next();

}


// Get Same Five Questions for All Students

app.get("/questions", checkLogin, async (req, res) => {

    try {

        const allQuestions = await Question.find().sort({ questionId: 1 });

        res.json(allQuestions.map(q => ({
            id: q.questionId,
            question: q.question,
            options: q.options
        })));

    }
    catch (err) {
        res.status(500).json({ message: "Question Loading Error" });
    }

});


// Submit Answers

app.post("/submit", checkLogin, async (req, res) => {

    try {

        const { answers } = req.body;

        if (!Array.isArray(answers) || answers.length !== 5) {
            return res.status(400).json({
                message: "Answer all five questions"
            });
        }

        const allQuestions = await Question.find().sort({ questionId: 1 });

        if (allQuestions.length !== 5) {
            return res.status(500).json({
                message: "Question collection error"
            });
        }

        const ids = answers.map(a => a.questionId);

        if (new Set(ids).size !== 5) {
            return res.status(400).json({
                message: "Duplicate questions are not allowed"
            });
        }

        let results = [];
        let correct = 0;

        for (let q of allQuestions) {

            const a = answers.find(
                item => item.questionId === q.questionId
            );

            if (!a || !q.options.includes(a.selectedAnswer)) {
                return res.status(400).json({
                    message: "Invalid or missing answer"
                });
            }

            const status = a.selectedAnswer === q.answer;

            if (status) correct++;

            results.push({
                questionId: q.questionId,
                question: q.question,
                selected: a.selectedAnswer,
                answer: q.answer,
                status: status ? "Correct" : "Wrong"
            });

        }

        const wrong = 5 - correct;

        await Submission.create({
            user: req.session.username,
            answers: results,
            score: correct,
            correct,
            wrong
        });

        res.json({
            message: "Survey Submitted Successfully",
            results,
            score: correct,
            correct,
            wrong
        });

    }
    catch (err) {
        res.status(500).json({ message: "Submission Error" });
    }

});


// Overall Analysis

app.get("/analysis", checkLogin, async (req, res) => {

    try {

        const totalUsers = await User.countDocuments();

        const submissions = await Submission.find();

        const participated = new Set(submissions.map(s => s.user));

        let correct = 0;
        let wrong = 0;

        submissions.forEach(s => {
            correct += s.correct;
            wrong += s.wrong;
        });


        // Question-wise Analysis

        const allQuestions = await Question.find().sort({ questionId: 1 });

        const questionAnalysis = allQuestions.map(q => {

            let right = 0;
            let incorrect = 0;

            submissions.forEach(s => {

                s.answers.forEach(a => {

                    if (a.questionId === q.questionId) {

                        if (a.status === "Correct") right++;
                        else incorrect++;

                    }

                });

            });

            return {
                question: q.question,
                correct: right,
                wrong: incorrect,
                total: right + incorrect
            };

        });


        // Student Performance

        const students = submissions.map(s => ({
            username: s.user,
            score: s.score,
            correct: s.correct,
            wrong: s.wrong
        }));


        res.json({
            totalUsers,
            attemptedStudents: participated.size,
            totalSubmissions: submissions.length,
            correct,
            wrong,
            questionAnalysis,
            students
        });

    }
    catch (err) {
        res.status(500).json({ message: "Analysis Error" });
    }

});


// Logout

app.get("/logout", (req, res) => {

    req.session.destroy(() => {
        res.json({ message: "Logged Out" });
    });

});


// Start Server

mongoose.connection.once("open", async () => {

    try {

        await addQuestions();

        app.listen(5000, () => {
            console.log("Server running on http://localhost:5000");
        });

    }
    catch (err) {
        console.log("Question Setup Error:", err);
    }

});