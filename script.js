// script.js
import { quizData } from './question/questions.js';

let currentQuestionIdx = 0;
let score = 0;
let wrongAnswers = 0;
let timerInterval;
let timeLeft = 15;
const timeLimit = 15;
let globalPlayerName = "Player"; 

// बटन इवेंट लिसनर्स बाइंडिंग
document.getElementById('start-btn').addEventListener('click', startQuiz);
document.getElementById('next-btn').addEventListener('click', nextQuestion);
document.getElementById('restart-btn').addEventListener('click', restartQuiz);

// थीम मॉडल हैंडलर्स
const overlay = document.getElementById('theme-overlay');
document.getElementById('theme-trigger-btn').addEventListener('click', () => overlay.classList.add('open'));
document.getElementById('theme-close-btn').addEventListener('click', () => overlay.classList.remove('open'));

document.querySelectorAll('.theme-opt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.theme-opt-btn').forEach(b => b.classList.remove('data-active'));
        e.target.classList.add('data-active');
        const newTheme = e.target.getAttribute('data-theme');
        document.body.className = '';
        document.body.classList.add(newTheme);
    });
});

// ⚡ 1. रेफ़रेंस ऐप की तरह असली डायनेमिक टेलीग्राम डेटा फ़ेचिंग इंजन
function parseTelegramProfile() {
    const tg = window.Telegram?.WebApp;
    
    // अगर टेलीग्राम वेबव्यू एक्टिव है और उसमें यूज़र ऑब्जेक्ट मौजूद है
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        // यूज़रनेम, नाम और आईडी अलग-अलग निकालना
        globalPlayerName = user.first_name || "Player";
        if (user.last_name) {
            globalPlayerName += ` ${user.last_name}`;
        }
        
        const rawUsername = user.username ? `@${user.username}` : "None";
        const rawId = user.id || "Unknown";
        const rawLang = user.language_code ? user.language_code.toUpperCase() : "HI";
        
        // 🚀 डायरेक्ट डॉम इंजेक्शन (DOM Injection): तुरंत फ्रंटएंड को अपडेट करना
        document.getElementById('user-display-name').innerText = user.username ? `@${user.username}` : globalPlayerName;
        document.getElementById('meta-user-name').innerText = globalPlayerName;
        document.getElementById('meta-user-username').innerText = rawUsername;
        document.getElementById('meta-user-id').innerText = rawId;
        document.getElementById('meta-user-lang').innerText = rawLang;
        
        // प्रोफ़ाइल अवतार हैंडलर (अगर सेटिंग्स लॉक है तो इनिशियल्स अवतार जेनरेट करना)
        const avatarImg = document.getElementById('user-avatar');
        if (user.photo_url && user.photo_url.trim() !== "") {
            avatarImg.src = user.photo_url;
        } else {
            const letter = globalPlayerName.charAt(0).toUpperCase();
            avatarImg.src = `https://ui-avatars.com{letter}&background=4f46e5&color=fff&bold=true`;
        }
        
        // टेलीग्राम स्क्रीन रेडी कस्टमाइज़ेशन
        tg.ready();
        tg.expand();
        if (tg.colorScheme) {
            document.body.setAttribute('data-tg-theme', tg.colorScheme);
        }
        return true; // डेटा सफलतापूर्वक लोड हुआ
    }
    return false; // टेलीग्राम ऑब्जेक्ट अभी रेडी नहीं है
}

// 🎯 2. ऑटो-रिकवरी लूप: जब तक टेलीग्राम का इंटरफ़ेस 100% सिंक न हो, यह हर 100ms पर री-चेक करेगा
let syncAttempts = 0;
const syncInterval = setInterval(() => {
    syncAttempts++;
    const isLoaded = parseTelegramProfile();
    
    // अगर डेटा मिल गया या 20 बार प्रयास (2 सेकंड) फेल हो गए, तो लूप बंद करें
    if (isLoaded || syncAttempts > 20) {
        clearInterval(syncInterval);
        
        // अगर 2 सेकंड बाद भी ऐप क्रोम/सफ़ारी में खुला है (टेलीग्राम के बाहर)
        if (!isLoaded) {
            console.log("Running in standard browser mode. Loading global mock fields.");
            globalPlayerName = "Anonymous Player";
            document.getElementById('user-display-name').innerText = "Guest Mode";
            document.getElementById('meta-user-name').innerText = "Guest";
            document.getElementById('meta-user-username').innerText = "@Guest_User";
            // आपकी फिक्स आईडी दिखाने के बजाय रैंडम आईडी जेनरेट होगी ताकि डेटा ओवरलैप न लगे
            document.getElementById('meta-user-id').innerText = Math.floor(1000000000 + Math.random() * 9000000000);
            document.getElementById('meta-user-lang').innerText = "HI";
            document.getElementById('user-avatar').src = "https://ui-avatars.com";
        }
    }
}, 100);


// ====================================================================
// 🎮 क्विज़ गेम कोर इंजन ऑपरेशन्स
// ====================================================================
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function startQuiz() {
    currentQuestionIdx = 0;
    score = 0;
    wrongAnswers = 0;
    switchScreen('quiz-screen');
    loadQuestion();
}

function loadQuestion() {
    clearInterval(timerInterval);
    timeLeft = timeLimit;
    document.getElementById('time-left').innerText = timeLeft;
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('explanation-box').style.display = 'none';
    
    const currentQuiz = quizData[currentQuestionIdx];
    
    document.getElementById('question-counter').innerText = `प्रश्न: ${currentQuestionIdx + 1}/${quizData.length}`;
    const progressPercent = (currentQuestionIdx / quizData.length) * 100;
    document.getElementById('progress-bar').style.width = `${progressPercent}%`;

    document.getElementById('question-text').innerText = `[${currentQuestionIdx + 1}/${quizData.length}] ${currentQuiz.question}`;

    const optionsList = document.getElementById('options-list');
    optionsList.innerHTML = '';
    
    currentQuiz.options.forEach((option, idx) => {
        const li = document.createElement('li');
        li.className = 'option-item';
        li.innerText = option;
        li.onclick = () => selectOption(idx, li);
        optionsList.appendChild(li);
    });

    startTimer();
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('time-left').innerText = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            autoTimeOut();
        }
    }, 1000);
}

function selectOption(selectedIdx, selectedElement) {
    clearInterval(timerInterval);
    const currentQuiz = quizData[currentQuestionIdx];
    const options = document.querySelectorAll('.option-item');

    options.forEach(opt => opt.classList.add('disabled'));

    if (selectedIdx === currentQuiz.correct) {
        selectedElement.classList.add('correct');
        score++;
    } else {
        selectedElement.classList.add('wrong');
        options[currentQuiz.correct].classList.add('correct');
        wrongAnswers++;
    }

    showExplanation(currentQuiz.explanation);
}

function autoTimeOut() {
    const currentQuiz = quizData[currentQuestionIdx];
    const options = document.querySelectorAll('.option-item');
    
    options.forEach(opt => opt.classList.add('disabled'));
    options[currentQuiz.correct].classList.add('correct');
    wrongAnswers++;

    showExplanation(`समय समाप्त! सही उत्तर: ${currentQuiz.explanation}`);
}

function showExplanation(text) {
    const expBox = document.getElementById('explanation-box');
    if (text) {
        expBox.innerHTML = `<b>📖 विवरण:</b> ${text}`;
        expBox.style.display = 'block';
    }
    document.getElementById('next-btn').style.display = 'block';
}

function nextQuestion() {
    currentQuestionIdx++;
    if (currentQuestionIdx < quizData.length) {
        loadQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    document.getElementById('progress-bar').style.width = '100%';
    switchScreen('result-screen');
    
    document.getElementById('result-user-name').innerText = globalPlayerName;
    document.getElementById('result-score').innerText = `${score}/${quizData.length}`;
    document.getElementById('stat-correct').innerText = score;
    document.getElementById('stat-wrong').innerText = wrongAnswers;
}

function restartQuiz() {
    switchScreen('start-screen');
              }
      
