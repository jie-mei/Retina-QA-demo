/**
 * Eyecapture Application
 * Professional medical quiz for AMD assessment training
 */

class EyecaptureQuiz {
    constructor() {
        // State
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.selectedAnswers = new Set();
        this.userAnswers = [];
        this.score = 0;
        this.settings = {
            questionCount: 10,
            difficulty: 'all'
        };

        // DOM Elements
        this.elements = {
            // Screens
            startScreen: document.getElementById('startScreen'),
            quizScreen: document.getElementById('quizScreen'),
            resultsScreen: document.getElementById('resultsScreen'),
            reviewScreen: document.getElementById('reviewScreen'),

            // Start Screen
            startQuizBtn: document.getElementById('startQuizBtn'),
            questionCountOptions: document.getElementById('questionCountOptions'),
            difficultyOptions: document.getElementById('difficultyOptions'),

            // Quiz Screen
            currentQuestion: document.getElementById('currentQuestion'),
            totalQuestions: document.getElementById('totalQuestions'),
            progressFill: document.getElementById('progressFill'),
            questionDifficulty: document.getElementById('questionDifficulty'),
            questionImage: document.getElementById('questionImage'),
            amdStage: document.getElementById('amdStage'),
            questionTopic: document.getElementById('questionTopic'),
            questionTypeBadge: document.getElementById('questionTypeBadge'),
            questionText: document.getElementById('questionText'),
            choicesContainer: document.getElementById('choicesContainer'),
            feedbackContainer: document.getElementById('feedbackContainer'),
            feedbackHeader: document.getElementById('feedbackHeader'),
            feedbackExplanation: document.getElementById('feedbackExplanation'),
            submitBtn: document.getElementById('submitBtn'),
            nextBtn: document.getElementById('nextBtn'),

            // Header Stats
            currentScore: document.getElementById('currentScore'),
            totalAnswered: document.getElementById('totalAnswered'),

            // Results Screen
            resultsIcon: document.getElementById('resultsIcon'),
            resultsMessage: document.getElementById('resultsMessage'),
            scoreRing: document.getElementById('scoreRing'),
            finalScore: document.getElementById('finalScore'),
            correctCount: document.getElementById('correctCount'),
            incorrectCount: document.getElementById('incorrectCount'),
            totalCount: document.getElementById('totalCount'),
            breakdownBars: document.getElementById('breakdownBars'),
            restartBtn: document.getElementById('restartBtn'),
            reviewBtn: document.getElementById('reviewBtn'),

            // Review Screen
            reviewList: document.getElementById('reviewList'),
            backToResultsBtn: document.getElementById('backToResultsBtn'),

            // Modal
            imageModal: document.getElementById('imageModal'),
            modalImage: document.getElementById('modalImage'),
            modalClose: document.getElementById('modalClose'),
            zoomBtn: document.getElementById('zoomBtn'),

            // Loading
            loadingOverlay: document.getElementById('loadingOverlay')
        };

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadQuestions();
        this.hideLoading();
    }

    bindEvents() {
        // Start Screen
        this.elements.startQuizBtn.addEventListener('click', () => this.startQuiz());

        // Option Buttons
        this.elements.questionCountOptions.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-btn')) {
                this.selectOption(e.target, 'questionCount');
            }
        });

        this.elements.difficultyOptions.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-btn')) {
                this.selectOption(e.target, 'difficulty');
            }
        });

        // Quiz Screen
        this.elements.submitBtn.addEventListener('click', () => this.submitAnswer());
        this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());

        // Results Screen
        this.elements.restartBtn.addEventListener('click', () => this.restart());
        this.elements.reviewBtn.addEventListener('click', () => this.showReview());

        // Review Screen
        this.elements.backToResultsBtn.addEventListener('click', () => this.showResults());

        // Image Modal
        this.elements.zoomBtn.addEventListener('click', () => this.openImageModal());
        this.elements.modalClose.addEventListener('click', () => this.closeImageModal());
        this.elements.imageModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeImageModal());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeImageModal();
            }
        });
    }

    selectOption(button, type) {
        const parent = button.parentElement;
        parent.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const value = button.dataset.value;
        if (type === 'questionCount') {
            this.settings.questionCount = value === 'all' ? 'all' : parseInt(value);
        } else if (type === 'difficulty') {
            this.settings.difficulty = value;
        }
    }

    async loadQuestions() {
        try {
            const response = await fetch('data/questions.json');
            if (!response.ok) throw new Error('Failed to load questions');

            const data = await response.json();
            this.allExams = data.exams;
            this.prepareQuestionPool();
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showError('Failed to load questions. Please refresh the page.');
        }
    }

    prepareQuestionPool() {
        this.questionPool = [];

        this.allExams.forEach(exam => {
            exam.questions.forEach(question => {
                this.questionPool.push({
                    ...question,
                    imageFile: exam.image_file,
                    amdStage: exam.amd_stage,
                    biomarkers: exam.biomarkers
                });
            });
        });
    }

    startQuiz() {
        // Filter by difficulty if needed
        let filteredQuestions = [...this.questionPool];

        if (this.settings.difficulty !== 'all') {
            filteredQuestions = filteredQuestions.filter(
                q => q.difficulty === this.settings.difficulty
            );
        }

        // Shuffle and select questions
        this.shuffleArray(filteredQuestions);

        const count = this.settings.questionCount === 'all'
            ? filteredQuestions.length
            : Math.min(this.settings.questionCount, filteredQuestions.length);

        this.questions = filteredQuestions.slice(0, count);

        if (this.questions.length === 0) {
            alert('No questions available with the selected criteria. Please try different settings.');
            return;
        }

        // Reset state
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.score = 0;
        this.updateHeaderStats();

        // Show quiz screen
        this.showScreen('quiz');
        this.renderQuestion();
    }

    renderQuestion() {
        const question = this.questions[this.currentQuestionIndex];

        // Reset state
        this.selectedAnswers.clear();
        this.elements.feedbackContainer.classList.add('hidden');
        this.elements.submitBtn.classList.remove('hidden');
        this.elements.submitBtn.disabled = true;
        this.elements.nextBtn.classList.add('hidden');

        // Update progress
        this.elements.currentQuestion.textContent = this.currentQuestionIndex + 1;
        this.elements.totalQuestions.textContent = this.questions.length;
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.elements.progressFill.style.width = `${progress}%`;

        // Update difficulty badge
        this.elements.questionDifficulty.textContent = question.difficulty;
        this.elements.questionDifficulty.dataset.difficulty = question.difficulty;

        // Update image
        this.elements.questionImage.src = `images/${question.imageFile}`;
        this.elements.questionImage.alt = `OCT B-scan for ${question.topic}`;

        // Update meta info
        this.elements.amdStage.textContent = this.formatAMDStage(question.amdStage);
        this.elements.questionTopic.textContent = question.topic;

        // Update question type
        const isMultiple = question.question_type === 'multiple';
        this.elements.questionTypeBadge.textContent = isMultiple
            ? 'Multiple Choice (Select all that apply)'
            : 'Single Choice';

        // Update question text
        this.elements.questionText.textContent = question.question_text;

        // Render choices
        this.renderChoices(question);
    }

    renderChoices(question) {
        const isMultiple = question.question_type === 'multiple';

        this.elements.choicesContainer.innerHTML = question.choices.map((choice, index) => `
            <div class="choice-item"
                 data-id="${choice.id}"
                 data-type="${isMultiple ? 'multiple' : 'single'}"
                 tabindex="0"
                 role="${isMultiple ? 'checkbox' : 'radio'}"
                 aria-checked="false">
                <span class="choice-indicator">${choice.id}</span>
                <span class="choice-text">${choice.text}</span>
            </div>
        `).join('');

        // Bind click events
        this.elements.choicesContainer.querySelectorAll('.choice-item').forEach(item => {
            item.addEventListener('click', () => this.selectChoice(item, isMultiple));
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectChoice(item, isMultiple);
                }
            });
        });
    }

    selectChoice(item, isMultiple) {
        if (item.classList.contains('disabled')) return;

        const choiceId = item.dataset.id;

        if (isMultiple) {
            // Toggle selection for multiple choice
            if (this.selectedAnswers.has(choiceId)) {
                this.selectedAnswers.delete(choiceId);
                item.classList.remove('selected');
                item.setAttribute('aria-checked', 'false');
            } else {
                this.selectedAnswers.add(choiceId);
                item.classList.add('selected');
                item.setAttribute('aria-checked', 'true');
            }
        } else {
            // Single selection
            this.elements.choicesContainer.querySelectorAll('.choice-item').forEach(el => {
                el.classList.remove('selected');
                el.setAttribute('aria-checked', 'false');
            });
            this.selectedAnswers.clear();
            this.selectedAnswers.add(choiceId);
            item.classList.add('selected');
            item.setAttribute('aria-checked', 'true');
        }

        // Enable submit button if at least one answer selected
        this.elements.submitBtn.disabled = this.selectedAnswers.size === 0;
    }

    submitAnswer() {
        const question = this.questions[this.currentQuestionIndex];
        const correctAnswers = question.choices
            .filter(c => c.is_correct)
            .map(c => c.id);

        // Check if answer is correct
        const selectedArray = Array.from(this.selectedAnswers);
        const isCorrect = this.arraysEqual(selectedArray.sort(), correctAnswers.sort());

        // Store user answer
        this.userAnswers.push({
            questionIndex: this.currentQuestionIndex,
            selected: selectedArray,
            correct: correctAnswers,
            isCorrect: isCorrect
        });

        if (isCorrect) {
            this.score++;
        }

        // Update header stats
        this.updateHeaderStats();

        // Mark choices as correct/incorrect
        this.elements.choicesContainer.querySelectorAll('.choice-item').forEach(item => {
            const choiceId = item.dataset.id;
            const isChoiceCorrect = correctAnswers.includes(choiceId);
            const wasSelected = this.selectedAnswers.has(choiceId);

            item.classList.add('disabled');

            if (isChoiceCorrect) {
                item.classList.add('correct');
            } else if (wasSelected && !isChoiceCorrect) {
                item.classList.add('incorrect');
            }
        });

        // Show feedback
        this.showFeedback(isCorrect, question);

        // Update buttons
        this.elements.submitBtn.classList.add('hidden');
        this.elements.nextBtn.classList.remove('hidden');
        this.elements.nextBtn.textContent = this.currentQuestionIndex < this.questions.length - 1
            ? 'Next Question'
            : 'View Results';
    }

    showFeedback(isCorrect, question) {
        const feedbackContainer = this.elements.feedbackContainer;
        feedbackContainer.classList.remove('hidden', 'correct', 'incorrect');
        feedbackContainer.classList.add(isCorrect ? 'correct' : 'incorrect');

        // Update header
        const feedbackHeader = this.elements.feedbackHeader;
        feedbackHeader.innerHTML = isCorrect
            ? `<svg class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
               </svg>
               <span class="feedback-title">Correct!</span>`
            : `<svg class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
               </svg>
               <span class="feedback-title">Incorrect</span>`;

        // Build explanation
        let explanationHtml = '';
        const selectedArray = Array.from(this.selectedAnswers);

        question.choices.forEach(choice => {
            const wasSelected = selectedArray.includes(choice.id);
            const isCorrectChoice = choice.is_correct;

            if (wasSelected || isCorrectChoice) {
                explanationHtml += `
                    <div class="explanation-item">
                        <span class="explanation-label">${choice.id}. ${isCorrectChoice ? '✓ Correct' : '✗ Incorrect'}:</span>
                        <span>${choice.reason}</span>
                    </div>
                `;
            }
        });

        this.elements.feedbackExplanation.innerHTML = explanationHtml;
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            this.showResults();
        }
    }

    showResults() {
        this.showScreen('results');

        const percentage = Math.round((this.score / this.questions.length) * 100);

        // Update score display
        this.elements.finalScore.textContent = percentage;
        this.elements.correctCount.textContent = this.score;
        this.elements.incorrectCount.textContent = this.questions.length - this.score;
        this.elements.totalCount.textContent = this.questions.length;

        // Animate score ring
        const circumference = 2 * Math.PI * 54; // r=54
        const offset = circumference - (percentage / 100) * circumference;
        setTimeout(() => {
            this.elements.scoreRing.style.strokeDashoffset = offset;
        }, 100);

        // Update icon and message based on score
        const resultsIcon = this.elements.resultsIcon;
        const resultsMessage = this.elements.resultsMessage;

        resultsIcon.classList.remove('excellent', 'good', 'fair', 'needs-improvement');

        if (percentage >= 90) {
            resultsIcon.classList.add('excellent');
            resultsMessage.textContent = 'Excellent! Outstanding performance!';
            resultsIcon.innerHTML = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="24" cy="24" r="20"/>
                <path d="M16 24l6 6 12-12"/>
            </svg>`;
        } else if (percentage >= 70) {
            resultsIcon.classList.add('good');
            resultsMessage.textContent = 'Good job! Solid understanding.';
            resultsIcon.innerHTML = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="24" cy="24" r="20"/>
                <path d="M16 24l6 6 12-12"/>
            </svg>`;
        } else if (percentage >= 50) {
            resultsIcon.classList.add('fair');
            resultsMessage.textContent = 'Fair performance. Keep practicing!';
            resultsIcon.innerHTML = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="24" cy="24" r="20"/>
                <path d="M12 24h24"/>
            </svg>`;
        } else {
            resultsIcon.classList.add('needs-improvement');
            resultsMessage.textContent = 'Keep studying. You can improve!';
            resultsIcon.innerHTML = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="24" cy="24" r="20"/>
                <path d="M24 16v8M24 32h.01"/>
            </svg>`;
        }

        // Render performance breakdown
        this.renderBreakdown();
    }

    renderBreakdown() {
        const breakdown = { basic: { correct: 0, total: 0 }, intermediate: { correct: 0, total: 0 }, advanced: { correct: 0, total: 0 } };

        this.questions.forEach((question, index) => {
            const difficulty = question.difficulty;
            if (breakdown[difficulty]) {
                breakdown[difficulty].total++;
                if (this.userAnswers[index]?.isCorrect) {
                    breakdown[difficulty].correct++;
                }
            }
        });

        this.elements.breakdownBars.innerHTML = Object.entries(breakdown)
            .filter(([_, data]) => data.total > 0)
            .map(([difficulty, data]) => {
                const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                return `
                    <div class="breakdown-item">
                        <span class="breakdown-label">${difficulty}</span>
                        <div class="breakdown-bar">
                            <div class="breakdown-bar-fill ${difficulty}" style="width: ${percentage}%"></div>
                        </div>
                        <span class="breakdown-score">${data.correct}/${data.total}</span>
                    </div>
                `;
            }).join('');
    }

    showReview() {
        this.showScreen('review');

        this.elements.reviewList.innerHTML = this.questions.map((question, index) => {
            const userAnswer = this.userAnswers[index];
            const isCorrect = userAnswer?.isCorrect;
            const selectedChoices = userAnswer?.selected || [];
            const correctChoices = question.choices.filter(c => c.is_correct);

            return `
                <div class="review-item ${isCorrect ? 'correct' : 'incorrect'}">
                    <div class="review-item-header">
                        <span class="review-item-number">${index + 1}</span>
                        <span class="review-item-question">${question.question_text}</span>
                        <span class="review-item-status">${isCorrect ? 'Correct' : 'Incorrect'}</span>
                    </div>
                    <div class="review-item-content">
                        <div class="review-item-image">
                            <img src="images/${question.imageFile}" alt="OCT image">
                        </div>
                        <div class="review-item-details">
                            ${!isCorrect ? `
                                <div class="review-answer incorrect">
                                    <div class="review-answer-label">Your Answer:</div>
                                    <div>${selectedChoices.map(id => {
                                        const choice = question.choices.find(c => c.id === id);
                                        return choice ? `${id}. ${choice.text}` : id;
                                    }).join('<br>')}</div>
                                </div>
                            ` : ''}
                            <div class="review-answer correct">
                                <div class="review-answer-label">Correct Answer:</div>
                                <div>${correctChoices.map(c => `${c.id}. ${c.text}`).join('<br>')}</div>
                            </div>
                            <div class="review-explanation">
                                <strong>Explanation:</strong><br>
                                ${correctChoices.map(c => c.reason).join('<br><br>')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    restart() {
        // Reset score ring
        this.elements.scoreRing.style.strokeDashoffset = 339.292;

        this.showScreen('start');
    }

    showScreen(screen) {
        // Hide all screens
        this.elements.startScreen.classList.add('hidden');
        this.elements.quizScreen.classList.add('hidden');
        this.elements.resultsScreen.classList.add('hidden');
        this.elements.reviewScreen.classList.add('hidden');

        // Show requested screen
        switch (screen) {
            case 'start':
                this.elements.startScreen.classList.remove('hidden');
                break;
            case 'quiz':
                this.elements.quizScreen.classList.remove('hidden');
                break;
            case 'results':
                this.elements.resultsScreen.classList.remove('hidden');
                break;
            case 'review':
                this.elements.reviewScreen.classList.remove('hidden');
                break;
        }
    }

    updateHeaderStats() {
        this.elements.currentScore.textContent = this.score;
        this.elements.totalAnswered.textContent = this.userAnswers.length;
    }

    openImageModal() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        this.elements.modalImage.src = `images/${currentQuestion.imageFile}`;
        this.elements.imageModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeImageModal() {
        this.elements.imageModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }

    showError(message) {
        this.elements.loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; color: #EF4444;">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
                <span class="loading-text" style="color: #EF4444;">${message}</span>
            </div>
        `;
    }

    formatAMDStage(stage) {
        const stageMap = {
            'Healthy': 'Healthy',
            'EarlyIntermediate': 'Early/Intermediate',
            'LateDry': 'Late Dry AMD',
            'LateWet': 'Late Wet AMD'
        };
        return stageMap[stage] || stage;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
}

// Initialize the quiz when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.quiz = new EyecaptureQuiz();
});
