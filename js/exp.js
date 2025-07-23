var exp = (function() {

    let p = {};

    // randomly assign to conditions and save settings
    const colorOrder = Math.floor(Math.random() * 2);

    const settings = {
        pM: [[.2, .8], [.8, .2]][Math.floor(Math.random() * 2)],
        pM_practice: .5,
        gameType: 'invStrk',
        nTrials: 50,
        basePay: 2.40,
        roundLength: 6,
        hex_1: ['#00aa00', '#1067e8'][colorOrder],
        hex_2: ['#00aa00', '#1067e8'][1 - colorOrder],
        gameName_1: ['<span style="color: #00aa00; font-weight: bold">Green Game</span>', '<span style="color: #1067e8; font-weight: bold">Blue Game</span>'][colorOrder],
        gameName_2: ['<span style="color: #00aa00; font-weight: bold">Green Game</span>', '<span style="color: #1067e8; font-weight: bold">Blue Game</span>'][1 - colorOrder],
        color_1: ['<span style="color: #00aa00; font-weight: bold">green</span>', '<span style="color: #1067e8; font-weight: bold">blue</span>'][colorOrder],
        color_2: ['<span style="color: #00aa00; font-weight: bold">green</span>', '<span style="color: #1067e8; font-weight: bold">blue</span>'][1 - colorOrder],
    };

    settings.tileHit_1 = `<div class="outcome-container">
                            <div class="header">{header}</div>
                            <div class="box" style="background-color:${settings.hex_1}"></div>
                        </div>`;

    settings.tileHit_2 = `<div class="outcome-container">
                            <div class="header">{header}</div>
                            <div class="box" style="background-color:${settings.hex_2}"></div>
                        </div>`;

    settings.tileMiss = `<div class="outcome-container">
                            <div class="header">{header}</div>
                            <div class="box" style="background-color:white"></div>
                        </div>`;

    // save condition and URL data
    jsPsych.data.addProperties({
        pM_1: settings.pM[0],
        pM_2: settings.pM[1],
        gameType: settings.gameType,
        basePay: settings.basePay,
        startTime: String(new Date()),
    });

   /*
    *
    *   INSTRUCTIONS
    *
    */


    // constructor function for presenting post-practice tile game information and assessing comprehension
    function MakeTaskInstructions(gameType, gameName_1, gameName_2, color, hex, roundLength, pM, round) {

        const gameName = (round == 1) ? gameName_1 : gameName_2;

        const howToEarn = {
            type: jsPsychInstructions,
            pages: dmPsych.tileGame_howToEarn(gameType, gameName_1, gameName_2, pM, color, hex, roundLength, round),
            show_clickable_nav: true,
        };

        let a1, a2, a3;

        if (gameType == 'invStrk') {
            // attention check #1
            a1 = 'By minimizing the lengths of my miss streaks.';
            a2 = (pM < .5) ? '20% of the time.' : '80% of the time.';
        };

        if (gameType == 'strk') {
            // attention check #1
            a1 = 'Earn as many tokens as possible.';
            a2 = 'By building streaks.';
            a3 = (pM < .5) ? 'Compared to practice, I will have less time to respond.' : (pM > .5) ? 'Compared to practice, I will have more time to respond.' : 'None of the above.';
        };

        if (gameType == '1inN') {
            // attention check #1
            a1 = 'Earn as many tokens as possible.';
            a2 = 'Activate a tile before my six chances are up.';
            a3 = (pM < .5) ? 'Compared to practice, I will have less time to respond.' : (pM > .5) ? 'Compared to practice, I will have more time to respond.' : 'None of the above.';
        };

        if (gameType == 'bern') {
            // attention check #1
            a1 = 'Earn as many tokens as possible.';
            a2 = 'By activating each individual tile.';
            a3 = (pM < .5) ? 'Compared to practice, I will have less time to respond.' : (pM > .5) ? 'Compared to practice, I will have more time to respond.' : 'None of the above.';
        };

        const compChk = {
            type: jsPsychSurveyMultiChoice,
            preamble: `<div style="font-size:16px"><p>To make sure you understand the ${gameName}, please answer the following questions:</p></div>`,
            questions: () => {
                const round1_Qs = [
                    {
                      prompt: `How do you earn points in the ${gameName}?`, 
                      name: 'attnChk1', 
                      options: ['By minimizing the lengths of my miss streaks.', 'By maximizing the lengths of my hit streaks.'], 
                      required: true
                    },
                    {
                      prompt: `In the ${gameName}, how often to players activate the tile?`, 
                      name: 'attnChk2', 
                      options: ['5% of the time.', '20% of the time.', '50% of the time.', '80% of the time.', '95% of the time.'], 
                      required: true
                    },
                ];
                const round2_Qs = [
                    {
                      prompt: `In the ${gameName}, how often to players activate the tile?`, 
                      name: 'attnChk1', 
                      options: ['5% of the time.', '20% of the time.', '50% of the time.', '80% of the time.', '95% of the time.'], 
                      required: true
                    },
                ];

                return (round == 1) ? round1_Qs : round2_Qs;
            },
            on_finish: (data) => {
                const correctAnswers = (round == 1) ? [a1, a2] : [a2];
                const totalErrors = dmPsych.getTotalErrors(data, correctAnswers);
                data.totalErrors = totalErrors;
            }
        };

        const errorMessage = {
            type: jsPsychInstructions,
            pages: [`<div class='parent'><p>You provided a wrong answer.<br>To make sure you understand the game, please continue to re-read the instructions.</p></div>`],
            show_clickable_nav: true,
        };

        const conditionalNode = {
            timeline: [errorMessage],
            conditional_function: () => {
                const fail = jsPsych.data.get().last(1).select('totalErrors').sum() > 0 ? true : false;
                return fail;
            }
        };

        const attnChkLoop = { 
            timeline: [howToEarn, compChk, conditionalNode],
            loop_function: () => {
                const fail = jsPsych.data.get().last(2).select('totalErrors').sum() > 0 ? true : false;
                return fail;
            },
        };

        const getReady = {
            type: jsPsychInstructions,
            pages: [`<div class='parent'><p>You're now ready to play the ${gameName}.</p><p>Proceed to begin.</p></div>`],
            show_clickable_nav: true,
        };

        this.timeline = [attnChkLoop, getReady];
    };


    // create instruction nodes

    p.consent = {
        type: jsPsychExternalHtml,
        url: "./html/consent.html",
        cont_btn: "advance",
    };

    p.intro = {
        type: jsPsychInstructions,
        pages: [`<div class='parent' style='text-align: left'>
                    <p>We are designing games that scientists can use to study visual attention. 
                    Our goal is to make the games as immersive and engaging as possible.
                    To make the games as immersive and engaging as possible, we are getting feedback from people like you.</p>
                </div>`,

                `<div class='parent' style='text-align: left'>
                    <p>You will play two different games: the ${settings.gameName_1} and the ${settings.gameName_2}. 
                    After each game, you will report how immersed and engaged you felt.</p>
                    <p>The games are very similar, but their color schemes will help you tell them apart.</p>
                    <p>Continue to learn about and play the ${settings.gameName_1}. After you finish, you'll learn about and play the ${settings.gameName_2}.</p>
                </div>`],
        show_clickable_nav: true,
        post_trial_gap: 500,
    };

    p.howToPlay = {
        type: jsPsychInstructions,
        pages: dmPsych.tileGame_howToPlay(settings.gameType, settings.gameName_1, settings.color_1, settings.hex_1, settings.roundLength),
        show_clickable_nav: true,
    };

    p.round1_howToEarn = new MakeTaskInstructions(settings.gameType, settings.gameName_1, settings.gameName_2, settings.color_1, settings.hex_1, settings.roundLength, settings.pM[0], 1);

    p.round1_complete = {
        type: jsPsychInstructions,
        pages: dmPsych.tileGame_round1Complete(settings.gameName_1, settings.gameName_2),
        show_clickable_nav: true,
    };

    p.round2_howToEarn = new MakeTaskInstructions(settings.gameType, settings.gameName_1, settings.gameName_2, settings.color_2, settings.hex_2, settings.roundLength, settings.pM[1], 2);


   /*
    *
    *   TASK
    *
    */

    p.round1 = new dmPsych.MakeTileGame(settings.hex_1, settings.tileHit_1, settings.tileMiss, settings.roundLength, settings.gameType, settings.nTrials, settings.pM[0], 'tileGame', 1);

    p.round2 = new dmPsych.MakeTileGame(settings.hex_2, settings.tileHit_2, settings.tileMiss, settings.roundLength, settings.gameType, settings.nTrials, settings.pM[1], 'tileGame', 2);

   /*
    *
    *   QUESTIONS
    *
    */

    // scales
    const zeroToExtremely = ["0<br>A little", '1', '2', '3', '4', '5', '6', '7', '8', '9', "10<br>Extremely"];
    const zeroToALot = ['0<br>A little', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10<br>A lot'];

    // constructor functions

    const flowQs = function(name, round) {
        this.type = jsPsychSurveyLikert;
        this.preamble = `<div style='padding-top: 50px; width: 850px; font-size:16px'>

        <p>To report how immersed and absorbed you felt in the ${name},<br>please answer the following question as honestly as possible:</p>`;
        this.questions = [
            {prompt: `During the ${name}, how <b>immersed</b> and <b>absorbed</b> did you feel in what you were doing?`,
            name: `flow`,
            labels: ["0<br>Not very", '1', '2', '3', '4', '5', '6', '7', '8', '9', "10<br>Extremely"]},
        ];
        this.randomize_question_order = false;
        this.scale_width = 700;
        this.data = {round: round};
        this.on_finish =(data) => {
            dmPsych.saveSurveyData(data);
        };
    };

    var enjoyQs = function(name, round) {
        this.type = jsPsychSurveyLikert;
        this.preamble = `<div style='padding-top: 50px; width: 850px; font-size:16px'>

        <p>Below are a few more questions about the ${name}.</p>

        <p>Instead of asking about immersion and engagement, these questions ask about <strong>enjoyment</strong>.<br>
        Report how much you <strong>enjoyed</strong> the ${name} by answering the following questions.</p></div>`;
        this.questions = [
            {prompt: `How much did you <strong>enjoy</strong> playing the ${name}?`,
            name: `enjoyable`,
            labels: zeroToALot},
            {prompt: `How much did you <strong>like</strong> playing the ${name}?`,
            name: `like`,
            labels: zeroToALot},
            {prompt: `How much did you <strong>dislike</strong> playing the ${name}?`,
            name: `dislike`,
            labels: zeroToALot},
            {prompt: `How much <strong>fun</strong> did you have playing the ${name}?`,
            name: `fun`,
            labels: zeroToALot},
            {prompt: `How <strong>entertaining</strong> was the ${name}?`,
            name: `entertaining`,
            labels: zeroToExtremely},
        ];
        this.randomize_question_order = false;
        this.scale_width = 700;
        this.data = {round: round};
        this.on_finish = (data) => {
            dmPsych.saveSurveyData(data);
        };
    };
    
    p.round1_Qs = {
        timeline: [new flowQs(settings.gameName_1, 1)]
    };

    p.round2_Qs = {
        timeline: [new flowQs(settings.gameName_2, 2)]
    };

    p.demographics = (function() {

        const goalProbe = {
            type: jsPsychSurveyMultiChoice,
            questions: [
                {
                    prompt: `<div style="width:850px"><p>When playing the Tile Game, different people think about their task in different ways.
                    For example, some people might trying to win as many rounds as possible. 
                    Other people might try to build "streaks" by activating as many tiles in a row as possible.
                    These are just some of the ways people might think about their task.</p>
                    <p><strong>Consider how you were thinking about your task. Which of the following statements best describes how you were thinking about your task during the Tile Game?</strong></p></div>`,
                    name: `goalRep`,
                    options: [`For each round, I was trying to activate a tile before my four chances were up.`, `I was trying to build streaks by activing as many tiles in a row as possible.`, `I was trying to activate every single tile I saw.`],
                    required: true,
                    horizontal: false,
                }],
            on_finish: (data) => {
                dmPsych.saveSurveyData(data);
            }
        };

        const demosIntro = {
            type: jsPsychInstructions,
            pages: [
                `<div class='parent'>
                    <p>Thank you for playing and evaluating our games!</p>
                    <p>Next, you will finish the study by answering a few final questions.</p>
                </div>`
            ],
            show_clickable_nav: true,
        };

        const gender = {
            type: jsPsychHtmlButtonResponse,
            stimulus: '<p>What is your gender?</p>',
            choices: ['Male', 'Female', 'Other'],
            on_finish: (data) => {
                data.gender = data.response;
            }
        };

        const age = {
            type: jsPsychSurveyText,
            questions: [{prompt: "Age:", name: "age"}],
            on_finish: (data) => {
                dmPsych.saveSurveyData(data); 
            },
        }; 

        const ethnicity = {
            type: jsPsychSurveyHtmlForm,
            preamble: '<p>What is your race / ethnicity?</p>',
            html: `<div style="text-align: left">
            <p>White / Caucasian <input name="ethnicity" type="radio" value="white"/></p>
            <p>Black / African American <input name="ethnicity" type="radio" value="black"/></p>
            <p>East Asian (e.g., Chinese, Korean, Vietnamese, etc.) <input name="ethnicity" type="radio" value="east-asian"/></p>
            <p>South Asian (e.g., Indian, Pakistani, Sri Lankan, etc.) <input name="ethnicity" type="radio" value="south-asian"/></p>
            <p>Latino / Hispanic <input name="ethnicity" type="radio" value="hispanic"/></p>
            <p>Middle Eastern / North African <input name="ethnicity" type="radio" value="middle-eastern"/></p>
            <p>Indigenous / First Nations <input name="ethnicity" type="radio" value="indigenous"/></p>
            <p>Bi-racial <input name="ethnicity" type="radio" value="indigenous"/></p>
            <p>Other <input name="other" type="text"/></p>
            </div>`,
            on_finish: (data) => {
                data.ethnicity = data.response.ethnicity;
                data.other = data.response.other;
            }
        };

        const english = {
            type: jsPsychHtmlButtonResponse,
            stimulus: '<p>Is English your native language?:</p>',
            choices: ['Yes', 'No'],
            on_finish: (data) => {
                data.english = data.response;
            }
        };  

        const finalWord = {
            type: jsPsychSurveyText,
            questions: [{prompt: "Questions? Comments? Complains? Provide your feedback here!", rows: 10, columns: 100, name: "finalWord"}],
            on_finish: (data) => {
                dmPsych.saveSurveyData(data); 
            },
        }; 


        const demos = {
            timeline: [demosIntro, gender, age, ethnicity, english, finalWord]
        };

        return demos;

    }());

   /*
    *
    *  END TASK
    *
    */


    p.save_data = {
        type: jsPsychPipe,
        action: "save",
        experiment_id: "3nssf88SrdiY",
        filename: dmPsych.filename,
        data_string: ()=>jsPsych.data.get().csv()
    };

    return p;

}());

const timeline = [exp.consent, exp.intro, exp.howToPlay, 
    exp.round1_howToEarn, exp.round1, exp.round1_Qs, exp.round1_complete, 
    exp.round2_howToEarn, exp.round2, exp.round2_Qs, exp.demographics, exp.save_data];

// initiate timeline
jsPsych.run(timeline);
