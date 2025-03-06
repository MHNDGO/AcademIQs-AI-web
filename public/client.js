let examType = '';
const form = document.getElementById('habit-form');
let timer;
let timeLeft;
let aiResponse = ''; 

if (localStorage.getItem("termsaccepted") === "true") {
    document.querySelector(".warning").style.display = "none";
}

function getSelectedCheckboxValues(name) {
    const checkboxes = document.getElementsByName(name);
    const values = [];
    for (const checkbox of checkboxes) {
        if (checkbox.checked) {
            values.push(checkbox.value);
        }
    }
    return values;
}

function getSelectedRadioValue(name) {
    const radios = document.getElementsByName(name);
    for (const radio of radios) {
        if (radio.checked) {
            return radio.value;
        }
    }
    return null;
}

const importPdfButton = document.getElementById('importPdfButton');
const pdfFileInput = document.getElementById('pdfFileInput');

importPdfButton.addEventListener('click', function() {
    pdfFileInput.click();
});

let currentPage = 0;
let allPageTexts = [];

function updatePreview() {
    const previewContainer = document.getElementById('content-preview');
    const currentPageText = allPageTexts[currentPage];

    if (currentPageText) {
        previewContainer.innerHTML = currentPageText;
    }

    document.getElementById('current-page').innerText = `Page ${currentPage + 1}`;
    document.getElementById('prev-page-button').disabled = currentPage === 0;
    document.getElementById('next-page-button').disabled = currentPage === allPageTexts.length - 1;
}

pdfFileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = function(e) {
                const pdfData = new Uint8Array(e.target.result);
                pdfjsLib.getDocument(pdfData).promise.then(pdf => {
                    const numPages = pdf.numPages;
                    allPageTexts = [];
                    currentPage = 0;

                    document.getElementById('progress-indicator').style.display = 'block';
                    document.getElementById('page-navigation').style.display = 'block';

                    let extractedText = '';

                    const extractPageText = (pageNum) => {
                        if (pageNum > numPages) {
                            document.getElementById('progress-text').innerText = `Processing complete: ${numPages} pages processed.`;
                        }
                        pdf.getPage(pageNum).then(page => {
                            return page.getTextContent().then(textContent => {
                                const textItems = textContent.items.map(item => item.str);
                                extractedText = textItems.join(' ');
                                allPageTexts[pageNum - 1] = extractedText; 
                    
                                document.getElementById('progress-text').innerText = `Processing page ${pageNum}/${numPages}`;
                    
                                if (pageNum === numPages) {
                                    updatePreview();
                                } else {
                                    extractPageText(pageNum + 1);
                                }
                            });
                        });
                    };
                    

                    extractPageText(1);
                }).catch(error => {
                    console.error('Error loading PDF:', error);
                });
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('Please upload a valid PDF file.');
        }
    }
});

document.getElementById('prev-page-button').addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage--;
        updatePreview();
    }
});

document.getElementById('next-page-button').addEventListener('click', () => {
    if (currentPage < allPageTexts.length - 1) {
        currentPage++;
        updatePreview();
    }
});


async function handleFormSubmit(event) {
    event.preventDefault();

    // Hide the results container when generating a new exam
    document.querySelector('#ai-results-container').style.display = 'none';

    const loadingDiv = document.querySelector('.loading');
    const aiResponseContainer = document.getElementById('ai-response-container');
    const aiPdfResponseContainer = document.getElementById('ai-pdf-response-container');
    const aiResponseElement = document.getElementById('ai-response');
    const aiResponsePdfElement = document.getElementById('ai-response-pdf');
    let answerPreference = getSelectedRadioValue("answer-preference");

    document.getElementById('timer-display').style.display = 'none';

    const solvePreference = getSelectedRadioValue('solve-preference'); 
    const examDefinition = getSelectedRadioValue('question-definition');
    const userName = document.getElementById('user-name').value;
    const examNotes = document.getElementById('extra-information').value;
    const questionTypes = getSelectedCheckboxValues('question_type');
    const examLanguage = getSelectedCheckboxValues('exam_language');
    const userAge = document.getElementById('user-age').value;
    const difficulty = getSelectedRadioValue('difficulty_level');
    const questionCount = document.getElementById('question-count').value;
    const examDuration = parseInt(document.getElementById('exam-duration').value, 10);
    const conceptTextareaValue = document.getElementById('conceptTextarea').value;
    const selectedOption = document.querySelector('input[name="option"]:checked')?.value;

    if (selectedOption === 'concept') {
        examType = `Concept about ${conceptTextareaValue}`;
    } else if (selectedOption === 'textParagraph') {
        examType = `Text paragraph about ${document.getElementById('pasteTextTextarea').value}`;
    }

    console.log('examType:', examType);

    form.style.display = 'none';
    loadingDiv.style.display = 'block';

    const solveFromWebsite = solvePreference === 'solve-from-web';
    const extractAsPDF = solvePreference === 'solve-as-pdf';

    let prompt;
    if (solveFromWebsite) {
        prompt = `
I want you to create questions for ${userAge} year old people which are in the same layout of an exam. Generate ${questionCount} questions of a ${examType} and make the 
questions ${examDefinition}, make them ${difficulty} difficulty, make the types of questions ${questionTypes.join(', ')}, and for the answers, make sure there are no answers shown to the user excpet the data-correct attribute.
Ensure the exam is in ${examLanguage}, and follow these notes: ${examNotes}. Make space between a,b,c and d in MCQ questions. If the user asks for questions about HTML or CSS or any code in general,
please replace the "<" symbol &lt; and replace the ">" &gt; so that it doesn't interfere with anything, be sure to use trusted sources such as BYJU's or Khan academy, but if nothing was found try searching for alternative and also trusty websites,
and something that you absolutely have to keep in mind, DO NOT, and I'm repeating, DO NOT, mess with the user in terms of questions, for example, you do a very strange bug in which when the user asks you to generate 30 questions, you generate 5, generate the full 30, generate all the questions needed,
, and don't worry, the maximum is 30, so please, generate everything, there are children who will solve this exam, you don't want to destroy their dreams and education because you didn't obey these rules, please follow everything, please.
OK, until now, these were all instructions, but there is something much
more important I want you to do, you'll do the exact following:
1-	I'll use your response as code for my website, so you have to do as I say, and you should present questions like this, the question statement itself, not the answer:
<span class='ai-question'> (Question goes here) </span>
2-	The answers available however should be presented like this:

<label class="container2"> (Answer Goes here) <input type="radio" name="q(the number of the question)" value="(Answer goes here)" class='ai-answer' data-selected='false'> <span class="checkmark2"></span></label>

3-For the right question, you'll add a data-correct = 'true' attribute, like this:
<label class="container2"> (Answer Goes here) <input type="radio" name="q(the number of the question)" value="(Answer goes here)" class='ai-answer' data-selected='false' data-correct='true'> <span class="checkmark2"></span></label>
The finished product will look something like this, if we are talking about question number 4 it will look like this:

<span class='ai-question'> 10. Which of the following is NOT found in plant cells? </span><br>
<label class="container2"> a) Chloroplasts <input type="radio" name="q4" value="Chloroplasts' class='ai-answer' data-selected='false'> <span class="checkmark2"></span></label>
<label class="container2"> b) Cell wall <input type="radio" name="q4" value="Cell wall' class='ai-answer' data-selected='false'> <span class="checkmark2"></span></label>
<label class="container2"> c) Centrioles <input type="radio" name="q4" value="Centrioles' data-correct = 'true' class='ai-answer' data-selected='false'> <span class="checkmark2"></span></label>
<label class="container2"> d) Vacuoles <input type="radio" name="q4" value="Vacuoles' class='ai-answer' data-selected='false'> <span class="checkmark2"></span></label>
and never ever mention anything about this html in the response, the response should be nothing but the things i ordered, don't do anything else, I also want you not to use the html thing you put in the beginning of every exam, it's disturbing and I only want you to generate the questions and nothing else, and the questions' names`;
    } else if (extractAsPDF) {
        prompt = `
I want you to create questions for ${userAge} year old people which are in the same layout of an exam. Generate ${questionCount} questions of a ${examType} and make the 
questions ${examDefinition}, make them ${difficulty} difficulty, make the types of questions ${questionTypes.join(', ')}, and for the answers, make ${answerPreference}.
Ensure the exam is in ${examLanguage}, Make space between a,b,c and d in MCQ questions.
 in case arabic is selected in language, Please use english numerals and mirror parantheses,
symbols like ( should become ), and symbols like ] should become [ and so on, And adhere to ${examNotes}, If the user asks for questions
about HTML or CSS or any code in general, please replace the "<" symbol &lt; and replace the ">" &gt; so that it doesn't interfere with anything.
لآe sure to use trusted sources such as BYJU's or Khan academy, but if nothing was found try searching for alternative and also trusty websites,
and something that you absolutely have to keep in mind, DO NOT, and I'm repeating, DO NOT, mess with the user in terms of questions, for example, you do a very strange bug in which when the user asks you to generate 30 questions, you generate 5, generate the full 30, generate all the questions needed,
, and don't worry, the maximum is 30, so please, generate everything, there are children who will solve this exam, you don't want to destroy their dreams and education because you didn't obey these rules, please follow everything, please.`;
    }

    console.log('Constructed Prompt:', prompt);

    try {
        const response = await fetch('test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, questionTypes, userAge, examType, examNotes, questionCount, examDuration }),
        });

        const data = await response.json();
        console.log('Server Response:', data);

        aiResponse = data.aiResponse;

        if (solveFromWebsite) {
            aiResponseElement.innerHTML = `Quiz:<br>${aiResponse.replace(/\*/g, '').replace(/\n/g, '<br>')}`;
            aiResponseContainer.style.display = 'block';

            // Attach event listeners to the newly generated radio buttons
            attachRadioButtonListeners();

            document.getElementById('timer-display').style.display = 'flex';
            timeLeft = examDuration * 60;
            startTimer(); 
        } else if (extractAsPDF) {
            aiResponsePdfElement.innerHTML = `Quiz:<br>${aiResponse.replace(/\*/g, '').replace(/\n/g, '<br>')}`;
            aiPdfResponseContainer.style.display = 'block';
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        loadingDiv.style.display = 'none';
    }
}

document.getElementById('habit-form').addEventListener('submit', handleFormSubmit);

let okayWorkingButton = document.getElementById("warningOkayButton");
okayWorkingButton.addEventListener("click", function() {
    document.querySelector(".warning").style.display = "none";
    localStorage.setItem("termsaccepted", true);
});

function handleOptionChange(value) {
    const conceptTextarea = document.getElementById('conceptTextarea');
    const textParagraphOptions = document.getElementById('textParagraphOptions');

    if (value === 'concept') {
        conceptTextarea.classList.remove('hidden');
        conceptTextarea.setAttribute('required', 'required'); 
        textParagraphOptions.classList.add('hidden');
        textParagraphOptions.querySelectorAll('input').forEach(input => {
            input.removeAttribute('required'); 
        });
    } else if (value === 'textParagraph') {
        conceptTextarea.classList.add('hidden');
        conceptTextarea.removeAttribute('required'); 
        textParagraphOptions.classList.remove('hidden');
        textParagraphOptions.querySelectorAll('input').forEach(input => {
            input.setAttribute('required', 'required'); 
        });
    }
}

function handleTextParagraphOption(value) {
    const pasteTextTextarea = document.getElementById('pasteTextTextarea');
    const pdfThings = document.getElementById('pdfThings');

    if (value === 'pasteText') {
        pasteTextTextarea.classList.remove('hidden');
        pasteTextTextarea.setAttribute('required', 'required'); 
        pdfThings.classList.add('hidden');
        pdfThings.querySelectorAll('input').forEach(input => {
            input.removeAttribute('required');
        });
    } else if (value === 'importPdf') {
        pasteTextTextarea.classList.add('hidden');
        pasteTextTextarea.removeAttribute('required'); 
        pdfThings.classList.remove('hidden');
        pdfThings.querySelectorAll('input').forEach(input => {
            input.setAttribute('required', 'required'); 
        });
    }
}



document.getElementById('conceptTextarea').addEventListener('input', () => {
examType = `Concept about ${document.getElementById('conceptTextarea').value}`;
});

document.getElementById('pasteTextTextarea').addEventListener('input', () => {
const pastedText = document.getElementById('pasteTextTextarea').value;
examType = `Text paragraph: "${pastedText}" (no external sources)`;
});

document.querySelectorAll('input[name="option"]').forEach(radio => {
radio.addEventListener('change', handleOptionChange);
});

document.querySelectorAll('input[name="textParagraphOption"]').forEach(radio => {
radio.addEventListener('change', handleTextParagraphOption);
});


document.getElementById('extract-range-button').addEventListener('click', () => {
    const startPage = parseInt(document.getElementById('start-page').value, 10);
    const endPage = parseInt(document.getElementById('end-page').value, 10);
    const numberOfPagesSelected = endPage - startPage + 1;

    let selectedContent = '';

    if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage > allPageTexts.length || startPage > endPage) {
        alert('Please enter a valid page range.');
        return;
    }

    if (numberOfPagesSelected > 5) {
        alert("Number of pages can't be higher than 5 for the Free Plan.");
        return;
    }

    selectedContent = allPageTexts.slice(startPage - 1, endPage).join('\n\n');

    document.getElementById('exam-content').value = selectedContent;
    examType = `textbook which states the following: "${selectedContent}", only ask about topics in this section and don't do anything else`;
});
document.getElementById("generate-pdf").addEventListener("click", () => {
    if (!aiResponse) {
        alert('Please generate questions first before creating a PDF.');
        return;
    }

    pdfMake.fonts = {
        notoSans: {
            normal: 'https://res.cloudinary.com/dlqtqzjbv/raw/upload/v1734217233/final.ttf',
            bold: 'https://res.cloudinary.com/dlqtqzjbv/raw/upload/v1734217648/final-bold.ttf'
        }
    };

    const pdfAppearance = getSelectedRadioValue('pdf-look');

    let documentDefinition = {};

    if (getSelectedCheckboxValues('exam_language')[0] === "Arabic") {
        function processArabicText(text) {
            return text
                .split('\n') 
                .map(line =>
                    line
                        .split(' ') 
                        .reverse()  
                        .join(' ') 
                )
                .join('\n');
        }
        let arabicContent = processArabicText(aiResponse);

        if (pdfAppearance === 'light') {
            documentDefinition = {
                content: [
                    { text: 'AI اكاديميكس', style: 'header', alignment: 'right', rtl: true },
                    { text: `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()} : التاريخ `, style: 'header', alignment: 'right', rtl: true },
                    { text: `عامًا ${document.getElementById('user-age').value} المستهدف: الجمهور  `, style: 'header', alignment: 'right', rtl: true },
                    { text: `${document.getElementById('user-name').value} الاسم:`, style: 'subheader', alignment: 'right', rtl: true },
                    { text: `دقيقه ${document.getElementById('exam-duration').value} المده:`, style: 'subheader', alignment: 'right', rtl: true },
                    { text: arabicContent, style: 'question', alignment: 'right', rtl: true },
                    { text: ' سعيداً! حظاً ', style: 'footer', alignment: 'right', rtl: true },
                ],
                defaultStyle: {
                    font: 'notoSans'
                },
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true,
                        margin: [0, 0, 0, 10]
                    },
                    subheader: {
                        fontSize: 14,
                        bold: true,
                        margin: [0, 5, 0, 5]
                    },
                    question: {
                        fontSize: 12,
                        margin: [0, 5, 0, 5]
                    },
                    footer: {
                        fontSize: 10,
                        margin: [0, 10, 0, 0]
                    }
                }
            };
        } else {
            documentDefinition = {
                content: [
                    { text: 'AI اكاديميكس', style: 'header', alignment: 'right', rtl: true },
                    { text: `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()} : التاريخ `, style: 'header', alignment: 'right', rtl: true },
                    { text: `عامًا ${document.getElementById('user-age').value} المستهدف: الجمهور  `, style: 'header', alignment: 'right', rtl: true },
                    { text: `${document.getElementById('user-name').value} الاسم:`, style: 'subheader', alignment: 'right', rtl: true },
                    { text: `دقيقه ${document.getElementById('exam-duration').value} المده:`, style: 'subheader', alignment: 'right', rtl: true },
                    { text: arabicContent, style: 'question', alignment: 'right', rtl: true },
                    { text: ' سعيداً! حظاً ', style: 'footer', alignment: 'right', rtl: true },
                ],
                defaultStyle: {
                    font: 'notoSans',
                    color: '#FFFFFF' 
                },
                background: function () {
                    return {
                        canvas: [
                            {
                                type: 'rect',
                                x: 0, y: 0, w: 595.28, h: 841.89,
                                color: '#121212' 
                            }
                        ]
                    };
                },
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true,
                        margin: [0, 0, 0, 10]
                    },
                    subheader: {
                        fontSize: 14,
                        bold: true,
                        margin: [0, 5, 0, 5]
                    },
                    question: {
                        fontSize: 12,
                        margin: [0, 5, 0, 5]
                    },
                    footer: {
                        fontSize: 10,
                        margin: [0, 10, 0, 0]
                    }
                }
            };
        }
    } else {
        if (pdfAppearance === 'light') {
            documentDefinition = {
                content: [
                    { text: 'AcademIQs Quiz', style: 'header' },
                    { text: `Date: ${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`, style: 'header' },
                    { text: `Target audience: ${document.getElementById('user-age').value} year old people`, style: 'header' },
                    { text: `Name: ${document.getElementById('user-name').value}`, style: 'subheader' },
                    { text: `Time: ${document.getElementById('exam-duration').value} minutes`, style: 'subheader' },
                    { text: aiResponse, style: 'question' },
                    { text: 'Good luck!', style: 'footer' },
                ],
                defaultStyle: {
                    font: 'notoSans'
                },
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true,
                        margin: [0, 0, 0, 10]
                    },
                    subheader: {
                        fontSize: 14,
                        bold: true,
                        margin: [0, 5, 0, 5]
                    },
                    question: {
                        fontSize: 12,
                        margin: [0, 5, 0, 5]
                    },
                    footer: {
                        fontSize: 10,
                        margin: [0, 10, 0, 0]
                    }
                }
            };
        } else {
            documentDefinition = {
                content: [
                    { text: 'AcademIQs Quiz', style: 'header' },
                    { text: `Date: ${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`, style: 'header' },
                    { text: `Target audience: ${document.getElementById('user-age').value} year old people`, style: 'header' },
                    { text: `Name: ${document.getElementById('user-name').value}`, style: 'subheader' },
                    { text: `Time: ${document.getElementById('exam-duration').value} minutes`, style: 'subheader' },
                    { text: aiResponse, style: 'question' },
                    { text: 'Good luck!', style: 'footer' },
                ],
                defaultStyle: {
                    font: 'notoSans',
                    color: '#FFFFFF'
                },
                background: function () {
                    return {
                        canvas: [
                            {
                                type: 'rect',
                                x: 0, y: 0, w: 595.28, h: 841.89,
                                color: '#121212' 
                            }
                        ]
                    };
                },
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true,
                        margin: [0, 0, 0, 10]
                    },
                    subheader: {
                        fontSize: 14,
                        bold: true,
                        margin: [0, 5, 0, 5]
                    },
                    question: {
                        fontSize: 12,
                        margin: [0, 5, 0, 5]
                    },
                    footer: {
                        fontSize: 10,
                        margin: [0, 10, 0, 0]
                    }
                }
            };
        }
    }

    pdfMake.createPdf(documentDefinition).download(`${document.getElementById('user-name').value}-AcademIQs-quiz.pdf`);
});
function getCorrectAnswers() {
    const correctAnswers = {};
    const radioButtons = document.querySelectorAll('input[type="radio"]');

    radioButtons.forEach(radio => {
        if (radio.hasAttribute('data-correct')) {
            const questionName = radio.getAttribute('name');
            const correctValue = radio.getAttribute('value');
            correctAnswers[questionName] = correctValue;
        }
    });

    return correctAnswers;
}
function checkAnswers() {
    const correctAnswers = getCorrectAnswers();
    let correctCount = 0;
    const resultElement = document.getElementById('result');
    const checkResultsButton = document.querySelector("#checkAnswersButon")
    const aiResultsContainer = document.querySelector('#ai-results-container')
    const aiResponseContainer = document.getElementById('ai-response-container');
    aiResponseContainer.style.display = 'none';
    let gradeLetter = document.querySelector('.grade-letter')
    let gradeTitle = document.querySelector('.grade-title')

    document.getElementById('timer-display').style.display = 'none';

    aiResultsContainer.style.display = "block";

    for (const question in correctAnswers) {
        const selectedAnswer = document.querySelector(`input[name="${question}"]:checked`);
        if (selectedAnswer && selectedAnswer.value === correctAnswers[question]) {
            correctCount++;
        }
    }
    let resultsPercentage = Math.round(correctCount / Object.keys(correctAnswers).length * 100);

    setProgress(resultsPercentage);

    resultElement.textContent = `You got ${correctCount} out of ${Object.keys(correctAnswers).length} correct!`;
    if (resultsPercentage > 90) {
        gradeLetter.textContent = "A+";
        gradeTitle.textContent = "Spectacular!";
    } else if (resultsPercentage >= 80 && resultsPercentage < 90) {
        gradeLetter.textContent = "A";
        gradeTitle.textContent = "Amazing!";
    } else if (resultsPercentage >= 70 && resultsPercentage < 80) {
        gradeLetter.textContent = "B+";
        gradeTitle.textContent = "Well done!";
    } else if (resultsPercentage >= 60 && resultsPercentage < 70) {
        gradeLetter.textContent = "B";
        gradeTitle.textContent = "Not bad!";
    } else if (resultsPercentage >= 50 && resultsPercentage < 60) {
        gradeLetter.textContent = "C+";
        gradeTitle.textContent = "Need to do better";
    } else if (resultsPercentage >= 40 && resultsPercentage < 50) {
        gradeLetter.textContent = "C";
        gradeTitle.textContent = "Needs much improvement";
    } else if (resultsPercentage < 40) {
        gradeLetter.textContent = "F";
        gradeTitle.textContent = "Failure.";
    }

    displayResults();
}
const radialProgress = document.querySelector(".RadialProgress");

function setProgress(progress){
  const value = `${progress}%`;
  radialProgress.style.setProperty("--progress", value);
  radialProgress.innerHTML = value;
  radialProgress.setAttribute("aria-valuenow", value);
};

function hideResultsButton() {
    const aiResultsContainer = document.querySelector('#ai-results-container');
    aiResultsContainer.style.display = 'none'; // Ensure this is hidden
    form.style.display = "block";
}
function startTimer() {
    const timerDisplay = document.getElementById('timer-display'); 
    updateTimerDisplay(timerDisplay, timeLeft); 

    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timerDisplay, timeLeft); 

        if (timeLeft <= 0) {
            clearInterval(timer); 
            checkAnswers(); 
        }
    }, 1000); 
}

function updateTimerDisplay(displayElement, time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    displayElement.innerHTML = `<i class="fa-sharp fa-regular fa-alarm-clock" style="margin-right: 10px;"></i> Time left: ${formattedTime}`;
}

const pdfOptionsSection = document.getElementById('pdf-options');

document.querySelectorAll('input[name="solve-preference"]').forEach(radio => {
    radio.addEventListener('change', function() {
        if (this.value === 'solve-as-pdf') {
            pdfOptionsSection.style.display = 'block'; 
            pdfOptionsSection.querySelectorAll('input').forEach(input => {
                input.setAttribute('required', 'required');
            });
        } else {
            pdfOptionsSection.style.display = 'none';
            pdfOptionsSection.querySelectorAll('input').forEach(input => {
                input.removeAttribute('required');
            });
        }
    });
});
document.getElementById('remove-response-btn-pdf').addEventListener('click', function () {
    document.getElementById('ai-pdf-response-container').style.display = 'none';
    form.style.display = 'block';
});
function getUserSelectedAnswers() {
    const userAnswers = {};
    const radioButtons = document.querySelectorAll('input[type="radio"]:checked');

    radioButtons.forEach(radio => {
        const questionName = radio.getAttribute('name');
        const userAnswer = radio.getAttribute('value');
        userAnswers[questionName] = userAnswer;
    });

    return userAnswers;
}
function parseAIResponse(aiResponse) {
    const questions = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(aiResponse, 'text/html');

    doc.querySelectorAll('.ai-question').forEach((question, index) => {
        const questionText = question.textContent.trim();
        const answers = [];

        let sibling = question.nextElementSibling;
        while (sibling && !sibling.classList.contains('ai-question')) {
            if (sibling.tagName === 'LABEL' && sibling.classList.contains('container2')) {
                const answerText = sibling.textContent.trim();
                const isCorrect = sibling.querySelector('input[data-correct="true"]') !== null;
                const isSelected = sibling.querySelector('input[data-selected="true"]') !== null;
                answers.push({ text: answerText, isCorrect, isSelected });
            }
            sibling = sibling.nextElementSibling;
        }

        questions.push({ question: questionText, answers });
    });

    return questions;
}
function displayResults() {
    const mistakesDiv = document.querySelector('.mistakes');
    mistakesDiv.innerHTML = ''; // Clear previous results

    const questions = parseAIResponse(aiResponse);

    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question');

        const questionText = document.createElement('p');
        questionText.textContent = `${question.question}`;
        questionDiv.appendChild(questionText);

        question.answers.forEach(answer => {
            const answerDiv = document.createElement('p');
            answerDiv.textContent = answer.text;

            // Check if the answer is marked as selected
            const selectedAnswer = document.querySelector(`input[name="${question.question}"][value="${answer.text}"]`);
            if (selectedAnswer && selectedAnswer.getAttribute('data-selected') === 'true') {
                answerDiv.style.textDecoration = 'underline'; // Underline selected answers
            }

            // Mark the correct answer in green
            if (answer.isCorrect) {
                answerDiv.style.color = 'green';
                answerDiv.style.fontWeight = 'bold';
            }

            // If the user's answer is incorrect, mark it in red
            if (selectedAnswer && selectedAnswer.getAttribute('data-selected') === 'true' && !answer.isCorrect) {
                answerDiv.style.color = 'red';
            }

            questionDiv.appendChild(answerDiv);
        });

        mistakesDiv.appendChild(questionDiv);
    });
}
document.getElementById('remove-response-btn').addEventListener('click', function () {
    clearInterval(timer); 
    timeLeft = 0; 
    document.getElementById('timer-display').style.display = 'none';

    document.getElementById('ai-response-container').style.display = 'none';
    document.querySelector("#ai-results-container").style.display = "none"; // Ensure this is hidden
    document.getElementById('ai-response').innerHTML = '';

    form.style.display = 'block';

    aiResponse = ''; 
});

function attachRadioButtonListeners() {
    // Only target radio buttons with the class 'ai-answer'
    document.querySelectorAll('input.ai-answer[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
            console.log(`Radio button ${this.value} selected.`); // Debugging: Log when a radio button is selected

            // Reset all radio buttons in the same group to data-selected='false'
            document.querySelectorAll(`input[name="${this.name}"]`).forEach(r => {
                r.setAttribute('data-selected', 'false');
            });

            // Set the selected radio button to data-selected='true'
            this.setAttribute('data-selected', 'true');
            console.log(`Updated ${this.value} to data-selected='true'.`); // Debugging: Log the update
        });
    });
}