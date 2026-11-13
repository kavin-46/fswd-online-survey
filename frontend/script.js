let currentQuestions = [];


// Register

async function register() {

    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;

    let res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    let data = await res.json();

    alert(data.message);

}


// Login

async function login() {

    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;

    let res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    let data = await res.json();

    alert(data.message);

    if (data.message === "Login Successful") {

        document.getElementById("login").style.display = "none";

        document.getElementById("dashboard").style.display = "block";

        document.getElementById("user").innerText = username;

    }

}


// Start Survey

async function startSurvey() {

    let res = await fetch("/questions");

    currentQuestions = await res.json();

    if (!res.ok) {
        alert(currentQuestions.message);
        return;
    }

    if (currentQuestions.length !== 5) {
        alert("Exactly five questions are required.");
        return;
    }

    let html = "<h2>Answer All Five Questions</h2>";

    currentQuestions.forEach((q, i) => {

        html += `
        <div class="question">
        <h3>${i + 1}. ${q.question}</h3>
        `;

        q.options.forEach(option => {

            html += `
            <label>
            <input type="radio" name="${q.id}" value="${option}">
            ${option}
            </label>
            `;

        });

        html += "</div>";

    });

    document.getElementById("survey").innerHTML = html;

    document.getElementById("submit").style.display = "inline";

    document.getElementById("result").innerHTML = "";

    document.getElementById("analysisSection").innerHTML = "";

}


// Submit Answers

async function submitSurvey() {

    let answers = [];

    for (let q of currentQuestions) {

        let selected = document.querySelector(
            `input[name="${q.id}"]:checked`
        );

        if (!selected) {
            alert("Please answer all five questions");
            return;
        }

        answers.push({
            questionId: q.id,
            selectedAnswer: selected.value
        });

    }

    let res = await fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
    });

    let data = await res.json();

    if (!res.ok) {
        alert(data.message);
        return;
    }

    document.getElementById("survey").innerHTML = "";

    document.getElementById("submit").style.display = "none";

    let html = `
    <h2>${data.message}</h2>
    <h2>Your Score: ${data.score}/5</h2>
    <h3 class="correct">Correct Answers: ${data.correct}</h3>
    <h3 class="wrong">Wrong Answers: ${data.wrong}</h3>
    <h2>Answer Details</h2>
    `;

    data.results.forEach(r => {

        html += `
        <div class="question">
        <h3>${r.question}</h3>
        <p>Your Answer: ${r.selected}</p>
        <p>Correct Answer: ${r.answer}</p>
        <h3 class="${r.status === 'Correct' ? 'correct' : 'wrong'}">
        ${r.status}
        </h3>
        </div>
        `;

    });

    document.getElementById("result").innerHTML = html;

}


// Overall Analysis

async function analysis() {

    let res = await fetch("/analysis");

    let data = await res.json();

    if (!res.ok) {
        alert(data.message);
        return;
    }

    let html = `
    <h2>OVERALL SURVEY ANALYSIS</h2>

    <div class="analysis-box">
    <h3>Total Registered Students: ${data.totalUsers}</h3>
    <h3>Students Participated: ${data.attemptedStudents}</h3>
    <h3>Total Submissions: ${data.totalSubmissions}</h3>
    <h3 class="correct">Total Correct Answers: ${data.correct}</h3>
    <h3 class="wrong">Total Wrong Answers: ${data.wrong}</h3>
    <h3>Total Answers: ${data.correct + data.wrong}</h3>
    </div>

    <h2>QUESTION WISE ANALYSIS</h2>
    `;

    data.questionAnalysis.forEach(q => {

        html += `
        <div class="question">
        <h3>${q.question}</h3>
        <p>Total Responses: ${q.total}</p>
        <p class="correct">Correct: ${q.correct}</p>
        <p class="wrong">Wrong: ${q.wrong}</p>
        </div>
        `;

    });

    html += "<h2>STUDENT PERFORMANCE</h2>";

    data.students.forEach(s => {

        html += `
        <div class="analysis-box">
        <h3>Student: ${s.username}</h3>
        <p>Score: ${s.score}/5</p>
        <p class="correct">Correct: ${s.correct}</p>
        <p class="wrong">Wrong: ${s.wrong}</p>
        </div>
        `;

    });

    document.getElementById("analysisSection").innerHTML = html;

}


// Logout

async function logout() {

    await fetch("/logout");

    location.reload();

}
