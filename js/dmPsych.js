const dmPsych = (function() {
  'use strict';

  const obj = {};

 /*
  *
  *  Set-up for Prolific and Data Pipe
  *
  */

  // initialize jsPsych
  window.jsPsych = initJsPsych({
    on_finish: () => {
      let boot = jsPsych.data.get().last(1).select('boot').values[0];
      if(!boot) {
        document.body.innerHTML = 
        `<div align='center' style="margin: 10%">
          <p>Thank you for participating!</p>
          <p><b>To receive payment, please wait to be re-directed to Prolific.</b></p>
        </div>`;
        setTimeout(() => { location.href = `https://app.prolific.co/submissions/complete?cc=${completionCode}` }, 4000);
      }
    },
  });

  // set and save subject ID
  let subject_id = jsPsych.data.getURLVariable("PROLIFIC_PID");
  if (!subject_id) subject_id = jsPsych.randomization.randomID(10);
  jsPsych.data.addProperties({ subject: subject_id, boot: false });

  // define file name
  obj.filename = `${subject_id}.csv`;

  // define completion code for Prolific
  const completionCode = "CW0CMZ8Y";

  // track fps
  let frames = 0, tic = performance.now(), fpsAdjust;
  (function getFpsAdjust() {
      const req = window.requestAnimationFrame(getFpsAdjust);
      frames++;
      if(frames == 120) { 
          fpsAdjust = (performance.now() - tic) / 2000;
          jsPsych.data.addProperties({fpsAdjust: fpsAdjust});
          frames = 0;
          tic = performance.now();
      };
  })();


 /*
  *
  *  David's task functions
  *
  */

  // logit function
  obj.logit = (rate, k, x0, shift) => {
    let x = rate
    let denom = 1 + Math.exp(-k * (x - x0));
    let logit = 1 / denom;
    let pPop = logit - shift;
    return pPop;
  };

  // save survey data in wide format
  obj.saveSurveyData = (data) => {
    const names = Object.keys(data.response);
    const values = Object.values(data.response);
    for(let i = 0; i < names.length; i++) {
        data[names[i]] = values[i];
    };      
  };

  // compute total number of errors on questionnaires
  obj.getTotalErrors = (data, correctAnswers) => {
    const answers = Object.values(data.response);
    const errors = answers.map((val, index) => val === correctAnswers[index] ? 0 : 1)
    const totalErrors = errors.reduce((partialSum, a) => partialSum + a, 0);
    return totalErrors;
  };

  // create fireworks display
  obj.drawFireworks = function (c, duration, maxFireworks, message, fontSize) {

    // get start time
    const start = performance.now();

    // get context
    let ctx = c.getContext('2d');

    // get text variables
    const lines = message.split('\n');

    const maxSparks = Math.min(maxFireworks*5, 60);
    let fireworks = [];
   
    for (let i = 0; i < maxFireworks; i++) {
      let firework = {
        sparks: []
      };
      for (let n = 0; n < maxSparks; n++) {
        let spark = {
          vx: Math.random() * 5 + .5,
          vy: Math.random() * 5 + .5,
          weight: Math.random() * .3 + .03,
          red: Math.floor(Math.random() * 2 + 1),
          green: Math.floor(Math.random() * 2 + 1),
          blue: Math.floor(Math.random() * 2 + 1)
        };
        if (Math.random() > .5) spark.vx = -spark.vx;
        if (Math.random() > .5) spark.vy = -spark.vy;
        firework.sparks.push(spark);
      };
      fireworks.push(firework);
      resetFirework(firework);
    };

    let myReq = window.requestAnimationFrame(explode);
   
    function resetFirework(firework) {
      firework.x = Math.floor(Math.random() * c.width);
      firework.y = c.height;
      firework.age = 0;
      firework.phase = 'fly';
    };
     
    function explode() {
      ctx.clearRect(0, 0, c.width, c.height);
      fireworks.forEach((firework,index) => {
        if (firework.phase == 'explode') {
            firework.sparks.forEach((spark) => {
            for (let i = 0; i < 10; i++) {
              let trailAge = firework.age + i;
              let x = firework.x + spark.vx * trailAge;
              let y = firework.y + spark.vy * trailAge + spark.weight * trailAge * spark.weight * trailAge;
              let fade = i * 10 + firework.age * 2 + 50;
              let r = Math.floor(spark.red * fade);
              let g = Math.floor(spark.green * fade);
              let b = Math.floor(spark.blue * fade);
              ctx.beginPath();
              ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',1)';
              ctx.rect(x, y, 5, 5);
              ctx.fill();
            }
          });
          firework.age = firework.age + fpsAdjust;
          if (firework.age > 50 && Math.random() < .05) {
            resetFirework(firework);
          }
        } else {
          firework.y = firework.y - (10 * fpsAdjust * 2);
          for (let spark = 0; spark < 15; spark++) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + (3 + index) * 50 + ',' + (3 + spark) * 17 + ',0,1)';
            ctx.rect( firework.x + Math.random() * spark - spark / 2, firework.y + spark * 4, 5, 5);
            ctx.fill();
          }
          if (Math.random() < .001 || firework.y < 200) firework.phase = 'explode';
        }
      });

      for (let i = 0; i<lines.length; i++) {
        ctx.fillStyle = 'black';
        ctx.font = ["normal "+fontSize[0]+"pt Arial", "normal "+fontSize[1]+"pt Arial"][i]
        let lineWidths = lines.map(x => ctx.measureText(x).width);
        ctx.fillText(lines[i], (c.width/2) - (lineWidths[i]/2), c.height/2 + (i*120) - 60);
      }

      if (performance.now() - start < duration) { //note this also
        myReq = window.requestAnimationFrame(explode);
      } else {
        cancelAnimationFrame(myReq);
      };        
    };

  };

  // create tile game
  obj.MakeTileGame = function(hex, tileHit, tileMiss, roundLength, gameType, nTrials, pM, blockName, roundNum) {

    let losses = 0, round = 1, streak = 0, trialNumber = 0, tooSlow = null, tooFast = null, totalTokens = 0, message;

    const winFeedback = (gameType == "strk" || gameType == "invStrk") ? "{strk-feedback}" : (blockName == "practice") ? "Success!" : "+10 Tokens";

    const lossFeedback = (gameType == "strk" || gameType == "invStrk") ? "{strk-feedback}" : (blockName == "practice") ? "Miss!" : "+0 Tokens";

    const tokens_html = `<div class="outcome-container">
                          <div class="header-win" style="color:${hex}">{header}</div>
                          <div class="token-text-win" style="color:${hex}">${winFeedback}</div>
                        </div>`;

    const tokens_bonus_html = `<div class="outcome-container">
                                <div class="header-win" style="color:${hex}">{header}</div>
                                <div class="token-text-win" style="color:${hex}">${winFeedback}</div>
                                <div class="bonus-text">+5 Bonus</div>
                              </div>`;

    const tokens_loss_html = `<div class="outcome-container">
                                <div class="header-win" style="color:${hex}">{header}</div>
                                <div class="token-text-win" style="color:${hex}">${winFeedback}</div>
                                <div class="penalty-text">-5 Loss</div>
                              </div>`;

    const noTokens_html = `<div class="outcome-container">
                            <div class="header-lose" style="color:grey">{header}</div>
                            <div class="token-text-lose">${lossFeedback}</div>
                          </div>`;

    const noTokens_bonus_html = `<div class="outcome-container">
                                  <div class="header-lose" style="color:grey">{header}</div>
                                  <div class="token-text-lose">${lossFeedback}</div>
                                  <div class="bonus-text">+5 Bonus</div>
                                </div>`;

    const noTokens_loss_html = `<div class="outcome-container">
                                  <div class="header-lose" style="color:grey">{header}</div>
                                  <div class="token-text-lose">${lossFeedback}</div>
                                  <div class="penalty-text">-5 Loss</div>
                                </div>`;

    const iti_html = `<div class="outcome-container">
                                <div class="header">{header}</div>
                              </div>`;

    const probe_html = `<div class="outcome-container">
                          <div class="header">{header}</div>
                          <div class="box" style="background-color:gray"></div>
                        </div>`;

    const warning_html = `<div class="outcome-container">
                            <div class="header">{header}</div>
                            <div class="warning-text"><p>Too Fast!</p><p>Please wait for the tile to appear before pressing your SPACEBAR</p></div>
                          </div>`;


    const makeFeedbackArray = function() {
      return jsPsych.randomization.repeat(['plus', 'minus', 'normal', 'normal', 'normal'], 1);
    }

    const latency = dmPsych.makeRT(nTrials, pM, roundLength, gameType);

    console.log(latency);

    let winArray = makeFeedbackArray();
    let lossArray = makeFeedbackArray();

    const intro = {
      type: jsPsychHtmlKeyboardResponse,
      data: {phase: 'intro', block: blockName, round: roundNum},
      stimulus: function() {
        if (gameType == 'invStrk') {
            return `<div style='font-size:35px'><p>Get ready!</p></div>`;
        };
        if (gameType == '1inN') {
            return `<div style='font-size:35px'><p>Get ready!</p></div>`;
        };
        if (gameType == 'strk') {
            return `<div style='font-size:35px'><p>Get ready!</p></div>`;
        };
        if (gameType == 'bern') {
            return `<div style='font-size:35px'><p>Get ready!</p></div>`;
        };
      },
      choices: "NO_KEYS",
      trial_duration: 2000,
    };

    const iti = {
      type: jsPsychHtmlKeyboardResponse,
      data: {phase: 'iti', block: blockName, round: roundNum},
      stimulus: () => {
        const header = (gameType == "strk") ? `Current Streak: ${streak}` : (gameType == "1inN") ? `Attempts remaining: ${6 - losses}` : "";
        return iti_html.replace("{header}", header);
      },
      choices: [" "],
      trial_duration: () => {
        let iti_draw = Math.floor(Math.random() * 1750) + 100;
        return iti_draw;
      },
      on_finish: (data) => {
        data.response == " " ? tooFast = 1 : tooFast = 0;
        data.tooFast = tooFast;
        data.trialNum = trialNumber;
      },
    };

    const warning = {
      type: jsPsychHtmlKeyboardResponse,
      data: {phase: 'warning', block: blockName, round: roundNum},
      choices: "NO_KEYS",
      stimulus: () => {
        const header = (gameType == "strk") ? `Current Streak: ${streak}` : (gameType == "1inN") ? `Attempts remaining: ${6 - losses}` : "";
        const message = warning_html.replace("{header}", header);
        return (tooFast) ? message : '';
      },
      trial_duration: () => {
        return (tooFast) ? 3500 : 0;
      },
    };

    const delayLoop = {
      timeline:[iti, warning],
      loop_function: (data) => {
        return (tooFast) ? true : false;
      },
    };

    const probe = {
      type: jsPsychHtmlKeyboardResponse,
      data: {phase: 'probe', block: blockName, round: roundNum},
      stimulus: () => {
        const header = (gameType == "strk") ? `Current Streak: ${streak}` : (gameType == "1inN") ? `Attempts remaining: ${6 - losses}` : "";
        return probe_html.replace("{header}", header);
      },
      choices: [" "],
      trial_duration: () => { 
        return latency[trialNumber] 
      },
      on_finish: (data) => {
        data.probeDuration = latency[trialNumber];
        data.response ? tooSlow = 0 : tooSlow = 1;
        data.tooSlow = tooSlow;
        data.trialNum = trialNumber;
      },
    };

    const outcome = {
      type: jsPsychHtmlKeyboardResponse,
      data: {phase: `activation`, block: blockName, round: roundNum},
      stimulus: () => {
        const header = (gameType == "strk") ? `Current Streak: ${streak}` : (gameType == "1inN") ? `Attempts remaining: ${6 - losses}` : "";
        if (!tooSlow) {
          return tileHit.replace("{header}", header);
        } else {
          return tileMiss.replace("{header}", header);
        }
      },
      choices: [" "],
      response_ends_trial: false,
      trial_duration: 1000,
      on_finish: (data) => {
        data.rt_adjusted = data.rt + latency[trialNumber];
        data.trialNum = trialNumber;
      }
    };

    const feedback = {
      type: jsPsychHtmlKeyboardResponse,
      data: {phase: `feedback`, block: blockName, round: roundNum},
      stimulus: () => {
        if (gameType == 'bern') {
          if (tooSlow) {
            let feedbackType = lossArray.pop();
            message = (feedbackType == "plus" && blockName !== "practice") ? noTokens_bonus_html : (feedbackType == "minus" && blockName !== "practice") ? noTokens_loss_html : noTokens_html;
            if (blockName !== "practice") {
              (feedbackType == "plus") ? totalTokens += 5 : (feedbackType == "minus") ? totalTokens -= 5 : totalTokens += 0;
            };            
            round++;
            if (lossArray.length == 0) {
              lossArray = makeFeedbackArray();
            };         
          } else {
            let feedbackType = winArray.pop();
            message = (feedbackType == "plus" && blockName !== "practice") ? tokens_bonus_html : (feedbackType == "minus" && blockName !== "practice") ? tokens_loss_html : tokens_html;
            if (blockName !== "practice") {
              (feedbackType == "plus") ? totalTokens += 15 : (feedbackType == "minus") ? totalTokens += 5 : totalTokens += 10;
            };               
            round++;
            if (winArray.length == 0) {
              winArray = makeFeedbackArray();
            };             
          };
          return message.replace('{header}', '');
        }; 
        if (gameType == '1inN') {
          if (tooSlow && losses < 5) {
            losses++;
            let header = `Attempts remaining: ${6 - losses}`;
            message = iti_html.replace("{header}", header);
          } else if (tooSlow && losses == 5) {
            losses = 0;
            let feedbackType = lossArray.pop();
            message = (feedbackType == "plus" && blockName !== "practice") ? noTokens_bonus_html : (feedbackType == "minus" && blockName !== "practice") ? noTokens_loss_html : noTokens_html;
            if (blockName !== "practice") {
              (feedbackType == "plus") ? totalTokens += 5 : (feedbackType == "minus") ? totalTokens -= 5 : totalTokens += 0;
            };
            round++;
            if (lossArray.length == 0) {
              lossArray = makeFeedbackArray();
            };
          } else {
            losses = 0;
            let feedbackType = winArray.pop();
            message = (feedbackType == "plus" && blockName !== "practice") ? tokens_bonus_html : (feedbackType == "minus" && blockName !== "practice") ? tokens_loss_html : tokens_html;
            if (blockName !== "practice") {
              (feedbackType == "plus") ? totalTokens += 15 : (feedbackType == "minus") ? totalTokens += 5 : totalTokens += 10;
            };            
            round++;
            if (winArray.length == 0) {
              winArray = makeFeedbackArray();
            };     
          };
          return message;
        };
        if (gameType == 'invStrk') {
          if (!tooSlow && streak < 20) {
            let finalStreak = streak;
            let feedbackType = null;
            streak = 0;
            message = (feedbackType == "plus" && blockName !== "practice") ? tokens_bonus_html : (feedbackType == "minus" && blockName !== "practice") ? tokens_loss_html : tokens_html;
            message = (blockName !== "practice") ? message.replace("{strk-feedback}", `+${20 - finalStreak} Points`) : message.replace("{strk-feedback}", `Final Streak: ${finalStreak}`); 
            message = (blockName !== "practice") ? message.replace('{header}', `Final Streak: ${finalStreak}`) : message.replace('{header}', ``);
            if (lossArray.length == 0) {
              lossArray = makeFeedbackArray();
            };
            if (blockName !== "practice") {
              (feedbackType == "plus") ? totalTokens += (finalStreak*10 + 5) : (feedbackType == "minus") ? totalTokens += (finalStreak*10 - 5) : totalTokens += (finalStreak*10);
            };    
          } else if (!tooSlow && streak == 20) {
            let feedbackType = null;
            message = (feedbackType == "plus" && blockName !== "practice") ? noTokens_bonus_html : (feedbackType == "minus" && blockName !== "practice") ? noTokens_loss_html : noTokens_html;
            message = (blockName !== "practice") ? message.replace("{strk-feedback}", `+0 Points`) : message.replace("{strk-feedback}", `Final Streak: 0`); 
            message = (blockName !== "practice") ? message.replace('{header}', `Final Streak: 0`) : message.replace('{header}', ``);
            if (lossArray.length == 0) {
              lossArray = makeFeedbackArray();
            };
            if (blockName !== "practice") {
              (feedbackType == "plus") ? totalTokens += 5 : (feedbackType == "minus") ? totalTokens -= 5 : totalTokens += 0;
            };    
          } else {
            streak++;
            message = iti_html.replace("{header}", `Current Streak: ${streak}`);
          };
          return message;
        };
        if (gameType == 'strk') {
          if (tooSlow && streak > 0) {
            let finalStreak = streak;
            let feedbackType = lossArray.pop();
            streak = 0;
            message = (feedbackType == "plus" && blockName !== "practice") ? tokens_bonus_html : (feedbackType == "minus" && blockName !== "practice") ? tokens_loss_html : tokens_html;
            message = (blockName !== "practice") ? message.replace("{strk-feedback}", `+${finalStreak * 10} Tokens`) : message.replace("{strk-feedback}", `Final Streak: ${finalStreak}`); 
            message = (blockName !== "practice") ? message.replace('{header}', `Final Streak: ${finalStreak}`) : message.replace('{header}', ``);
            if (lossArray.length == 0) {
              lossArray = makeFeedbackArray();
            };
            if (blockName !== "practice") {
              (feedbackType == "plus") ? totalTokens += (finalStreak*10 + 5) : (feedbackType == "minus") ? totalTokens += (finalStreak*10 - 5) : totalTokens += (finalStreak*10);
            };    
          } else if (tooSlow && streak == 0) {
            let feedbackType = lossArray.pop();
            message = (feedbackType == "plus" && blockName !== "practice") ? noTokens_bonus_html : (feedbackType == "minus" && blockName !== "practice") ? noTokens_loss_html : noTokens_html;
            message = (blockName !== "practice") ? message.replace("{strk-feedback}", `+0 Tokens`) : message.replace("{strk-feedback}", `Final Streak: 0`); 
            message = (blockName !== "practice") ? message.replace('{header}', `Final Streak: 0`) : message.replace('{header}', ``);
            if (lossArray.length == 0) {
              lossArray = makeFeedbackArray();
            };
            if (blockName !== "practice") {
              (feedbackType == "plus") ? totalTokens += 5 : (feedbackType == "minus") ? totalTokens -= 5 : totalTokens += 0;
            };    
          } else {
            streak++;
            message = iti_html.replace("{header}", `Current Streak: ${streak}`);
          };
          return message;
        };
      },
      choices: "NO_KEYS",
      trial_duration: 2000,
      on_finish: (data) => {
        trialNumber++;
        if (trialNumber == nTrials) { 
          trialNumber = 0;
          losses = 0;
          streak = 0 
        };
        !tooSlow ? data.jackpot = true : data.jackpot = false;      
        data.totalTokens = totalTokens;
        data.trialNum = trialNumber;
      },
    };

    const task = {
      timeline: [delayLoop, probe, outcome, feedback],
      repetitions: nTrials,
    };

    this.timeline = [intro, task];

  };

  // make n-dimensional array of RTs given p(hit) = p
  obj.makeRT = function(nTrials, pWin, roundLength, gameType) {

    const nChunks = Math.round(nTrials / 10);
    const nWinsPerChunk = Math.round(10 * pWin);
    const nLossPerChunk = Math.round(10 * (1 - pWin));

    let rtArray = [];

    for (let i = 0; i < 4; i++) {
      let winArray = Array(nWinsPerChunk).fill(750);
      let lossArray = Array(nLossPerChunk).fill(200);
      let concatArray = winArray.concat(lossArray);
      let shuffledArray = jsPsych.randomization.repeat(concatArray, 1);
      rtArray.push(...shuffledArray);
    };

    let winArray = Array(nWinsPerChunk - 1).fill(750);
    let lossArray = Array(nLossPerChunk).fill(200);
    let concatArray = winArray.concat(lossArray);
    let shuffledArray = jsPsych.randomization.repeat(concatArray, 1);
    shuffledArray.push(750);
    rtArray.push(...shuffledArray);
    return rtArray;

  };

  // spinner task
  obj.spinner = function(canvas, spinnerData, score, sectors) {

    /* get context */
    const ctx = canvas.getContext("2d"); 

    /* get pointer */
    const pointer = document.querySelector("#spin");

    /* get score message */
    const scoreMsg = document.getElementById("score");

    /* get wheel properties */
    let wheelWidth = canvas.getBoundingClientRect()['width'];
    let wheelHeight = canvas.getBoundingClientRect()['height'];
    let wheelX = canvas.getBoundingClientRect()['x'] + wheelWidth / 2;
    let wheelY = canvas.getBoundingClientRect()['y'] + wheelHeight / 2;
    const tot = sectors.length; // total number of sectors
    const rad = wheelWidth / 2; // radius of wheel
    const PI = Math.PI;
    const arc = (2 * PI) / tot; // arc sizes in radians

    /* spin dynamics */
    const friction = 0.98;  // 0.995=soft, 0.99=mid, 0.98=hard
    const angVelMin = 5;    // Below that number will be treated as a stop
    let angVelMax = 0;      // Random ang.vel. to acceletare to 
    let angVel = 0;         // Current angular velocity

    /* state variables */
    let isGrabbed = false;       // true when wheel is grabbed, false otherwise
    let isDragging = false;      // true when wheel is being dragged, false otherwise
    let isSpinning = false;      // true when wheel is spinning, false otherwise
    let isAccelerating = false;  // true when wheel is accelerating, false otherwise
    let lastAngles = [0,0,0];    // store the last three angles
    let correctSpeed = [0]       // speed corrected for 360-degree limit
    let startAngle = null;       // angle of grab
    let oldAngle = 0;            // wheel angle prior to last perturbation
    let currentAngle = null;     // wheel angle after last perturbation
    let onWheel = false;         // true when cursor is on wheel, false otherwise

    /* define spinning functions */
    const onGrab = (x, y) => {
      if (!isSpinning) {
        canvas.style.cursor = "grabbing";
        isGrabbed = true;
        startAngle = calculateAngle(x, y);
      };
    };

    const calculateAngle =  (currentX, currentY) => {
      let xLength = currentX - wheelX;
      let yLength = currentY - wheelY;
      let angle = Math.atan2(xLength, yLength) * (180/Math.PI);
      return 360 - angle;
    };

    const onMove = (x, y) => {
      if(isGrabbed) {
        canvas.style.cursor = "grabbing";
        isDragging = true;
      };
      if(!isDragging)
        return
      lastAngles.shift();
      let deltaAngle = calculateAngle(x, y) - startAngle;
      currentAngle = deltaAngle + oldAngle;
      lastAngles.push(currentAngle);
      let speed = lastAngles[2] - lastAngles[0];
      if (Math.abs(speed) < 200) {
        correctSpeed.shift();
        correctSpeed.push(speed);
      };
      render(currentAngle);
    };

    const render = (deg) => {
      canvas.style.transform = `rotate(${deg}deg)`;
    };

    const onRelease = function() {
      isGrabbed = false;
      if(isDragging){
        isDragging = false;
        oldAngle = currentAngle;
        let speed = correctSpeed[0];
        if (Math.abs(speed) > angVelMin) {
          isAccelerating = true;
          isSpinning = true;
          angVelMax = rand(25, 50);
          giveMoment(speed)
        };
      };   
    };

    const giveMoment = function(speed) {

      // stop accelerating when max speed is reached
      if (Math.abs(speed) >= angVelMax) isAccelerating = false;

      // accelerate
      if (isAccelerating) {
        speed *= 1.06; // Accelerate
        const req = window.requestAnimationFrame(giveMoment.bind(this, speed));
        oldAngle += speed;
        lastAngles.shift();
        lastAngles.push(oldAngle);
        render(oldAngle);
      }
      
      // decelerate and stop
      else {
        isAccelerating = false;
        speed *= friction; // Decelerate by friction  
        const req = window.requestAnimationFrame(giveMoment.bind(this, speed));
        if (Math.abs(speed) > angVelMin * .1) {
          // decelerate
          oldAngle += speed;
          lastAngles.shift();
          lastAngles.push(oldAngle);
          render(oldAngle);       
        } else {
          // stop spinner
          speed = 0;
          currentAngle = oldAngle;
          let sector = sectors[getIndex()];
          spinnerData.outcomes.push(parseFloat(sector.label));
          drawSector(sectors, getIndex());
          updateScore(parseFloat(sector.label), sector.color);
          window.cancelAnimationFrame(req);
        };
      };
    };

    /* generate random float in range min-max */
    const rand = (m, M) => Math.random() * (M - m) + m;

    const updateScore = (points, color) => {
      score += points;
      spinnerData.score = score;
      scoreMsg.innerHTML = `<span style="color:${color}; font-weight: bolder">${score}</span>`;
      setTimeout(() => {
        scoreMsg.innerHTML = `${score}`
        isSpinning = false;
        drawSector(sectors, null);
        onWheel ? canvas.style.cursor = "grab" : canvas.style.cursor = "";
      }, 1000);
    };

    const getIndex = () => {
      let normAngle = 0;
      let modAngle = currentAngle % 360;
      if (modAngle > 270) {
        normAngle = 360 - modAngle + 270;
      } else if (modAngle < -90) { 
        normAngle =  -modAngle - 90;
      } else {
        normAngle = 270 - modAngle;
      }
      let sector = Math.floor(normAngle / (360 / tot));
      return sector;
    };

    /* Draw sectors and prizes texts to canvas */
    const drawSector = (sectors, sector) => {
      for (let i = 0; i < sectors.length; i++) {
        const ang = arc * i;
        ctx.save();
        // COLOR
        ctx.beginPath();
        ctx.fillStyle = sectors[i].color;
        ctx.moveTo(rad, rad);
        ctx.arc(rad, rad, rad, ang, ang + arc);
        ctx.lineTo(rad, rad);
        ctx.fill();
        // TEXT
        ctx.translate(rad, rad);
        ctx.rotate( (ang + arc / 2) + arc );
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        if (isSpinning && i == sector) {
          ctx.font = "bolder 50px sans-serif"
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 8;
          ctx.strokeText(sectors[i].label, 0, -140);
          ctx.fillText(sectors[i].label, 0, -140);
        } else {
          ctx.font = "bold 50px sans-serif"
          ctx.fillText(sectors[i].label, 0, -140);
        }
        // RESTORE
        ctx.restore();
      }
    };

    drawSector(sectors, null);

    /* add event listners */
    canvas.addEventListener('mousedown', function(e) {
        if (onWheel) { onGrab(e.clientX, e.clientY) };
    });

    canvas.addEventListener('mousemove', function(e) {
        let dist = Math.sqrt( (wheelX - e.clientX)**2 + (wheelY - e.clientY)**2 );
        dist < rad ? onWheel = true : onWheel = false;
        onWheel && !isGrabbed && !isSpinning ? canvas.style.cursor = "grab" : canvas.style.cursor = "";
        if(isGrabbed && onWheel) { onMove(e.clientX, e.clientY) };
    });

    window.addEventListener('mouseup', onRelease);

    window.addEventListener('resize', function(event) {
      wheelWidth = canvas.getBoundingClientRect()['width'];
      wheelHeight = canvas.getBoundingClientRect()['height'];
      wheelX = canvas.getBoundingClientRect()['x'] + wheelWidth / 2;
      wheelY = canvas.getBoundingClientRect()['y'] + wheelHeight / 2;
    }, true);
  };

  // function for drawing hole in one game on canvas
  obj.holeInOne = (function () {

    let game = {};

    // import methods from matter.js and define physics engine
    let { Engine, Render, Vertices, Composite, World, Bodies, Events, Mouse, MouseConstraint } = Matter;
    let engine = Engine.create();



    // temporary data
    let ballXtrial = [0];   // ball's X coordinates on current trial
    let ballYtrial = [0];   // ball's Y coordinate on current trial
    let endTrial = false; // flag whether the current trial is complete
    let firing = false;   // flag whether the slingshot was fired
    let inTheHole = false;  // flag whether the ball went through the hold
    let intro = 0;        // use to determine which instructions to display during introduction
    let warning = false;  // warn user to stay in play area
    let dragging = false; // true when user is drawing sling

    // data to save
    game.data = {
      ballX: [],      // ball's X coordinates on all trials
      ballY: [],      // ball's Y coordinates on all trials
      totalTrials: 0,   // total number of trials
      totalScore: 0   // total times getting the ball through the hole
    };

    // run slingshot game
    game.run = function(c, trial) {
      let mouse, mouseConstraint;

      let context = c.getContext('2d');

      // import settings
      var set = {
        ball: {
          x: trial.ball_xPos*c.width, 
          y: trial.ball_yPos*c.height, 
          rad: trial.ball_size, 
          fric: trial.friction, 
          col: trial.ball_color
        },
        wall: {
          x: trial.wall_xPos*c.width,
          yTop: (1/6)*(c.height-trial.hole_size),
          yBottom: (5/6)*c.height + (1/6)*trial.hole_size,
          width: trial.wall_width,
          height: .5*(c.height-trial.hole_size),
          col: trial.wall_color
        },
        sling: {
          stiffness: trial.tension,
          x: trial.ball_xPos*c.width,
          y: trial.ball_yPos*c.height
        },
        canvas: {
          height: c.height,
          width: c.width
        }
      };

      // construct ball
      function Ball() {           
        this.body = Bodies.circle(set.ball.x, set.ball.y, set.ball.rad, { frictionAir: set.ball.fric });
        World.add(engine.world, this.body);
      };

      // construct target
      function Wall(y, tri) {
        this.body = Bodies.fromVertices(set.wall.x, y, tri, { isStatic: true });
        World.add(engine.world, this.body);
      };

      // construct sling
      function Sling() {    
        this.body = Matter.Constraint.create({
          pointA: {x: set.sling.x, y: set.sling.y},
          bodyB: ball,
          stiffness: set.sling.stiffness,
        });
        World.add(engine.world, this.body);
      };

      // construct mouse
      function makeMouse() {    
        mouse = Mouse.create(c);
        mouseConstraint = MouseConstraint.create(engine, { mouse: mouse });
        World.add(engine.world, mouseConstraint);
      };

      // construct text
      function text(c) {

        if (warning) {
          c.font = "bold 25px Arial";
          c.fillStyle = 'red';
          c.fillText("Please keep your mouse inside the play area.", 75, 350);          
        }

        if (intro <= 3) {
          c.font = "bold 20px Arial";
          c.fillStyle = 'red';
          c.fillText("Shoot the ball through the hole.", 75, 60);
        };

        if (game.data.totalTrials == 0 && intro <= 2) {
          c.font = "16px Arial";
          c.fillStyle = "white";
          c.fillText("Step 1: Click and hold the ball. Keeping your cursor in the play area,", 75, 100);
          c.fillText("pull the ball to the left to draw your sling.", 75, 120);
        };

        if (game.data.totalTrials == 0 && intro > 0 && intro <= 2) {
          c.font = "16px Arial";
          c.fillStyle = "white";
          c.fillText("Step 2: Aim at the hole,", 75, 160);
          c.fillText("then release the ball to launch.", 75, 180);
        };

        if (game.data.totalTrials == 1 && intro > 1 && intro <= 3) {
          c.font = "16px Arial";
          c.fillStyle = "white";
          c.fillText("Good job! Please spend the next few", 75, 100);
          c.fillText("minutes playing Hole in One. We'll let", 75, 120);
          c.fillText("you know when time is up.", 75, 140);
        };
      };

      // shoot sling
      function shootSling() { 
        Events.on(mouseConstraint, 'startdrag', function(e) {
          tracker.ball = ball;
          dragging = true;
          endTrial = false;
          if (!warning) {
            intro++;
          } else {
            warning = false;
          };
        });
        Events.on(mouseConstraint, 'enddrag', function(e) {
          if(e.body === ball) {
            firing = true;
            dragging = false;
          };
        });
        Events.on(engine, 'beforeUpdate', function() {
          var xDelta = Math.abs(ball.position.x-set.ball.x);
          var yDelta = Math.abs(ball.position.y-set.ball.y);
          if(firing && xDelta < (set.ball.rad*2) && yDelta < (set.ball.rad*2)) {
            sling.bodyB = null;
            firing = false;
            intro++;
          };
        });
      };

      c.addEventListener("mouseleave", () => {
        // reset sling if player leaves canvas
        if (dragging & !warning) {
          warning = true;
          World.remove(engine.world, ball)
          ball = new Ball().body;
          sling.bodyB = ball;
          makeMouse();
          shootSling();
          trackBall();
          recordData();
        }
      });

      // track location of ball
      function trackBall() {    
        Events.on(engine, "beforeUpdate", function() {
          var xLoc = tracker.ball.position.x;
          var yLoc = tracker.ball.position.y;
          var xLimR = set.canvas.width*1.5;
          var xLimL = set.ball.x;
          var yLim = set.canvas.height;
          if (xLoc>xLimL && xLoc<xLimR && yLoc<yLim) {
            ballXtrial.push(xLoc);
            ballYtrial.push(yLoc);
          }
          if (xLoc > set.wall.x && !endTrial) {
            inTheHole = true;
          }
        });
      };

      // record data
      function recordData() {
        Events.on(engine, "beforeUpdate", function () {
          var xLoc = tracker.ball.position.x
          var yLoc = tracker.ball.position.y
          var xLim = set.canvas.width;
          var yLim = set.canvas.height;
          if(!endTrial && yLoc>(yLim*2) || !endTrial && xLoc>(xLim*2)) {

            // save data
            game.data.ballX.push(ballXtrial);
            game.data.ballY.push(ballYtrial);
            game.data.totalTrials++;
            if (inTheHole) game.data.totalScore++;

            // reset variables
            ballXtrial = [0];
            ballYtrial = [0];
            endTrial = true;
            inTheHole = false;

            // replace ball
            ball = new Ball().body;
            sling.bodyB = ball;
          };
        })
      };

      // draw spring
      function drawSpring(x1, y1, x2, y2, windings, width, offset, col1, col2, lineWidth){
        var x = x2 - x1;
        var y = y2 - y1;
        var dist = Math.sqrt(x * x + y * y);
        
        var nx = x / dist;
        var ny = y / dist;
        context.strokeStyle = col1
        context.lineWidth = lineWidth;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(x1,y1);
        x1 += nx * offset;
        y1 += ny * offset;
        x2 -= nx * offset;
        y2 -= ny * offset;
        var x = x2 - x1;
        var y = y2 - y1;
        var step = 1 / (windings);
        for(var i = 0; i <= 1-step; i += step){  // for each winding
            for(var j = 0; j < 1; j += 0.05){
                var xx = x1 + x * (i + j * step);
                var yy = y1 + y * (i + j * step);
                xx -= Math.sin(j * Math.PI * 2) * ny * width;
                yy += Math.sin(j * Math.PI * 2) * nx * width;
                context.lineTo(xx,yy);
            }
        }
        context.lineTo(x2, y2);
        context.lineTo(x2 + nx * offset, y2 + ny * offset)
        context.stroke();
        context.strokeStyle = col2
        context.lineWidth = lineWidth - 4;
        var step = 1 / (windings);
        context.beginPath();
        context.moveTo(x1 - nx * offset, y1 - ny * offset);
        context.lineTo(x1, y1);
        context.moveTo(x2, y2);
        context.lineTo(x2 + nx * offset, y2 + ny * offset)
        for(var i = 0; i <= 1-step; i += step){  // for each winding
            for(var j = 0.25; j <= 0.76; j += 0.05){
                var xx = x1 + x * (i + j * step);
                var yy = y1 + y * (i + j * step);
                xx -= Math.sin(j * Math.PI * 2) * ny * width;
                yy += Math.sin(j * Math.PI * 2) * nx * width;
                if(j === 0.25){
                    context.moveTo(xx,yy);
                
                }else{
                    context.lineTo(xx,yy);
                }
            }
        }
        context.stroke();
      };

      // specify vertices for walls
      var topWallVert = Vertices.fromPath(`0 0 0 ${set.wall.height} ${set.wall.width} 0`)
      var bottomWallVert = Vertices.fromPath(`0 0 0 ${set.wall.height} ${set.wall.width} ${set.wall.height}`)

      // construct bodies and mouse
      var ball = new Ball().body;
      var tracker = { ball: ball };
      var triWallTop = new Wall(set.wall.yTop, topWallVert).body;
      var triWallBottom = new Wall(set.wall.yBottom, bottomWallVert).body;
      var sling = new Sling().body;
      makeMouse();

      // call functions
      shootSling();
      trackBall();
      recordData();

      (function render_func() {
        let bodies = Composite.allBodies(engine.world)
        let constraints = Composite.allConstraints(engine.world);
        const req = window.requestAnimationFrame(render_func);
        let ballPos;
        constraints[0].stiffness = trial.tension * fpsAdjust;

        context.fillStyle = 'black';
        context.fillRect(0, 0, c.width, c.height);

        text(context);

        if (constraints[0].bodyB) {
          drawSpring(constraints[0].pointA.x, constraints[0].pointA.y, constraints[0].bodyB.position.x, constraints[0].bodyB.position.y, 4, 6, 0, "white", "#999", 3);
        }
       
        // draw bodies
        for (var i = 0; i < bodies.length; i += 1) {
          context.beginPath();
          context.fillStyle = 'white';
          context.strokeStyle = 'white';
          let body = bodies[i];
          if(body.label != 'Circle Body') {
            context.fillStyle = '#999';
            context.strokeStyle = '#999';
          };
          var vertices = bodies[i].vertices;
          context.moveTo(vertices[0].x, vertices[0].y);
          for (var j = 1; j < vertices.length; j += 1) {
              context.lineTo(vertices[j].x, vertices[j].y);
          };
          context.lineTo(vertices[0].x, vertices[0].y);
          context.fill();
          context.lineWidth = 1;
          context.stroke();
        };

        Engine.update(engine, (1000/60)*fpsAdjust);

        if(game.data.totalTrials == trial.total_shots) {
          cancelAnimationFrame(req);
        };

      })();

    };

    return game;

  }());

  // function for drawing hole in one game on canvas
  obj.float = (function () {

    let game = {};

    // import methods from matter.js and define physics engine
    let { Engine, World, Bodies, Body, Composite, Events} = Matter;
    let engine = Engine.create();

    // data to save
    game.data = {
      ball_locs: [],   // ball's y position at each frame
      tPress: [0],     // timestamp of each button press
      nPress: 0,       // total number of button presses
      glitch: [],      // true each time the ball leaves the canvas
      score: [],       // array of points earned on each click
      total_score: 0,  // sum of all points
      press_rate: [],  // array of instantaneous rates of button-pressing
      start_time: 0,   // time of first button-press
    };

    // run float game
    game.run = function(c, trial) {
      let ctx = c.getContext('2d');  // get context

      // add bodies to world
      let ceiling = Bodies.rectangle(c.width / 2, -30, c.width, 100, { isStatic: true });  // create ceiling
      let floor = Bodies.rectangle(c.width / 2, c.height + 30, c.width, 100, { isStatic: true });  // create floor
      let ball = Bodies.circle(c.width / 2, 280, trial.ball_size);  // create ball
      engine.world.gravity.y = trial.gravity;  // set gravity
      World.add(engine.world, [floor, ceiling, ball]);  // add to world

      // force
      let mid_pos = c.height / 2;  // middle of canvas
      let bottom_pos = c.height - (trial.ball_size + 20);  // ball's position while on floor
      let max_force = trial.target_force - trial.slope*(mid_pos - bottom_pos);  // maximum force given target force and slope
      let force;

      // outcomes
      let outcomes = [];  // array of outcomes to display
      ctx.font = "30px Arial";
      let outcome_height = ctx.measureText(`+ 2`).actualBoundingBoxAscent + ctx.measureText(`+ 2`).actualBoundingBoxDescent; // height of outcome text

      // zones
      let rgb = [[240, 228, 66], [213, 94, 0], [0, 158, 115], [86, 180, 233]];  // color of each zone when at max luminance
      let zone1_shift = -90;  // distance between top of zone 1 and middle of canvas
      let zone_size = 63;  // height of each zone
      let zone_values = [2, 10, 1, 3];  // points associated with each zone
      let color_weight = [.5, .5, .5, .5];  // weights applied to colors used for zones     

      // make new spark
      function MakeOutcome(zone_idx, points) {
        this.vx = Math.random() + 2;
        this.vy = -3 - Math.random();
        this.weight = .3;
        this.age = 0;
        this.zone_idx = zone_idx;
        this.points = points;
      };

      // show outcome
      function showOutcome() {
        outcomes.forEach((outcome) => {
          let y_init =  (c.height / 2) + zone1_shift + (60 * outcome.zone_idx) + 30 + (outcome_height / 2);
          let x = (c.width / 2) + outcome.vx * outcome.age;
          let y = y_init + outcome.vy * outcome.age + outcome.weight * outcome.age * outcome.weight * outcome.age;
          ctx.beginPath();
          ctx.font = "bold 45px Arial";
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          ctx.fillStyle = `rgb(${rgb[outcome.zone_idx][0]}, ${rgb[outcome.zone_idx][1]}, ${rgb[outcome.zone_idx][2]})`;
          ctx.fillText(`+${outcome.points}`, x, y);    
          ctx.strokeText(`+${outcome.points}`, x, y);    
          outcome.age = outcome.age + (2 * fpsAdjust);
        });
      };

      // track location of ball
      Events.on(engine, "beforeUpdate", function() { 
        if (ball.position.y > c.height || ball.position.y < 0) {
          World.remove(engine.world, ball);
          ball = Bodies.circle(c.width / 2, 280, trial.ball_size);
          World.add(engine.world, ball);
          game.data.glitch.push(true);
        };
        force =  Math.max(trial.target_force, max_force + (ball.position.y - bottom_pos)*trial.slope) * (.5 / fpsAdjust);
        game.data.ball_locs.push(ball.position.y);
      });

      // keydown function
      document.body.onkeydown = function(e) {
        if (e.key == " " || e.code == "Space" || e.keyCode == 32) {

          // time of each press in seconds from first press
          if (game.data.nPress == 0) {
            game.data.start_time = performance.now();
          } else {
            let press_time = (performance.now() - game.data.start_time) / 1000;
            game.data.tPress.push(press_time);
          };

          game.data.nPress++;

          // instantaneous press rate
          if (game.data.tPress.length > 1) {
            game.data.press_rate.push(1 / (game.data.tPress[game.data.tPress.length - 1] - game.data.tPress[game.data.tPress.length - 2]));
          }

          // press outcome (if button pressed in zone)
          for (let z = 0; z < zone_values.length; z++) {
            if (ball.position.y > (c.height / 2) + zone1_shift + (z * zone_size) & ball.position.y < (c.height / 2) + zone1_shift + ((z + 1) * zone_size)) {
              color_weight[z] = 1;
              game.data.score.push(zone_values[z]);
              game.data.total_score = game.data.total_score + zone_values[z];
              outcomes.push(new MakeOutcome(z, zone_values[z]));
            };
          };

          // press outcome (if button not pressed in a zone)
          if (color_weight.reduce((partialSum, a) => partialSum + a, 0) == 2) {
            game.data.score.push(0);
          };

          // reset zone color after 100ms
          setTimeout(() => { 
            color_weight = [.5, .5, .5, .5];
          }, 100);

          // apply force to ball
          Body.applyForce( ball, {x: ball.position.x, y: ball.position.y}, {x: 0, y: -force});
   
          console.log(game.data.press_rate.reduce((partialSum, a) => partialSum + a, 0) / game.data.press_rate.length);
        };
      };

      function drawScore() {
        ctx.fillStyle = '#D3D3D3';
        let score_width = ctx.measureText(`Points: ${game.data.total_score}`).width;
        ctx.fillText(`Points: ${game.data.total_score}`, (c.width / 2) - (score_width / 2), 80);   
      };

      function drawBodies() {
        let bodies = Composite.allBodies(engine.world)
        for (var i = 0; i < bodies.length; i += 1) {
          ctx.beginPath();
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'white';
          let body = bodies[i];
          if(body.label != 'Circle Body') {
            ctx.fillStyle = '#999';
            ctx.strokeStyle = '#999';
          };   
          var vertices = bodies[i].vertices;
          ctx.moveTo(vertices[0].x, vertices[0].y);
          for (var j = 1; j < vertices.length; j += 1) {
              ctx.lineTo(vertices[j].x, vertices[j].y);
          };
          ctx.lineTo(vertices[0].x, vertices[0].y);
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.stroke();
        };
      };

      function drawZones() {
        for (let z = 0; z < zone_values.length; z++) {
          ctx.fillStyle = `rgb(${rgb[z][0]*color_weight[z]}, ${rgb[z][1]*color_weight[z]}, ${rgb[z][2]*color_weight[z]})`
          ctx.fillRect(0, (c.height / 2) + zone1_shift + (zone_size * z), c.width, zone_size);
          ctx.fillStyle = 'black';
          let text_width = ctx.measureText(`${zone_values[z]}`).width;
          ctx.fillText(`${zone_values[z]}`, (c.width / 2) - (text_width / 2), (c.height / 2) + zone1_shift + (zone_size * z) + (zone_size / 2) + (outcome_height / 2));    
        };        
      };

      function drawCircle() {
        if (ball.position.y > (c.height / 2) - 80 & ball.position.y < (c.height / 2) + 80) {
          ctx.strokeStyle = 'red';
        } else {
          ctx.strokeStyle = 'white';
        };
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(c.width / 2, c.height / 2, 80, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.lineWidth = 1;
      };

      (function render_func() {
        const req = window.requestAnimationFrame(render_func);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.font = "30px Arial";

        drawZones();
        drawScore();
        showOutcome();
        drawBodies();

        Engine.update(engine, (1000/60)*fpsAdjust);

      })();

    };

    return game;

  }());

 /*
  *
  *  David's text functions
  *
  */

  obj.consentForm = function({basePay}) {
    const html = [`<div class='parent' style='height: 1000px; width: 1000px'>
        <p><b>Adult Consent for Participation in a Research Project<br>
        200 FR 2 (2017-1)</b><br>
        Study Title: Choices, decisions, and pursuits<br>
        Investigator: Paul Stillman<br>
        HSC #: 2000023892</p>

        <p><b>Purpose:</b><br>
        You are invited to participate in a research study designed to examine judgment and decision-making.</p>

        <p><b>Procedures:</b><br>
        If you agree to take part, your participation in this study will involve answering a series of questions as well as making choices between different options that will be presented to you as part of study activities. We anticipate that your involvement will require ~13 minutes.</p>

        <p><b>Compensation:</b><br>
        You'll receive $${basePay} in exchange for your participation.</p>

        <p><b>Risks and Benefits:</b><br>
        There are no known or anticipated risks associated with this study. Although this study will not benefit you personally, we hope that our results will add to the knowledge about judgment and decision-making.</p>

        <p><b>Confidentiality:</b><br>
        All of your responses will be anonymous.  Only the researchers involved in this study and those responsible for research oversight will have access to any information that could identify you/that you provide. The researcher will not know your name, and no identifying information will be connected to your survey answers in any way. The survey is therefore anonymous. However, your account is associated with an mTurk number that the researcher has to be able to see in order to pay you, and in some cases these numbers are associated with public profiles which could, in theory, be searched. For this reason, though the researcher will not be looking at anyone’s public profiles, the fact of your participation in the research (as opposed to your actual survey responses) is technically considered “confidential” rather than truly anonymous.”</p>

        <p><b>Voluntary Participation:</b><br>
        Your participation in this study is voluntary. You are free to decline to participate, to end your participation at any time for any reason, or to refuse to answer any individual question without penalty.</p>

        <p><b>Questions:</b><br>
        If you have any questions about this study, you may contact the principal investigator, Paul Stillman, (paul.stillman@yale.edu). If you would like to talk with someone other than the researchers to discuss problems or concerns, to discuss situations in the event that a member of the research team is not available, or to discuss your rights as a research participant, you may contact the Yale University Human Subjects Committee, 203-785-4688, human.subjects@yale.edu. Additional information is available at http://your.yale.edu/research-support/human-research/research-participants</p>

        <p>Would you like to continue to the study? Press the "Next" button to indicate that you consent to participate in the study.</p>`]
    return html;
  };

  obj.tileGame_round1Complete = function(game1, game2) {
      const html = [`<div class='parent'>
          <p>Thank you for playing the ${game1}!</p>
          <p>Next, you'll play the ${game2}.</p></div>`];
      return html;
  };

  obj.practiceComplete_tileGame = function() {
      const html = [`<div class='parent'>
        <p>Practice is now complete.<br>
        Next, you'll complete the full version of the Tile Game.</p></div>`];
      return html;
  };

  obj.tileGame_howToPlay = function(gameType, gameName, color, hex, roundLength) {

      let html;

      if (gameType == 'invStrk') {
          html = [
                
                `<div class='parent'>
                  <p>Throughout the ${gameName}, you'll attempt to "activate" the tile grey tile below.</p>
                  <div class='box' style='background-color:gray'></div>
                </div>`,

                `<div class='parent'>
                  <p>The tile will appear on your screen, then quickly disappear. To activate it, you must press your SPACEBAR 
                  before it disappears; whenever you see the tile, you should press your SPACEBAR as fast as possible.</p>
                  <div class='box' style='background-color:gray'></div>
                </div>`,

                `<div class='parent'>
                  <p>If you miss the tile by responding too slowly, it will disappear...</p>
                  <div class='box' style='background-color:white'></div>
                </div>`,

                `<div class='parent'>
                  <p>...then you'll see the length of your current "miss streak."</br>
                  For instance, if you miss the tile 3 times in a row, you'll see the following message:</p>
                  <div class="header" style="top:30%">Current Streak: 3</div>
                </div>`,

                `<div class='parent'>
                  <p>If you activate the tile, it will turn ${color}...</p>
                  <div class='box' style='background-color:${hex}'></div>
                </div>`,

                `<div class='parent'>
                  <p>...then you'll see how long your miss streak lasted.</br>
                  For instance, if you activate the tile after 3 consecutive misses, you'll see the following message:</p>
                  <div class="header" style="top:30%">Final Streak: 3</div>
                </div>`,
          ];     
      };

      if (gameType == 'strk') {
          html = [
                `<div class='parent'>
                  <p>In the ${gameName}, your goal is to build winning streaks.</br>
                  A winning streak is a series of consecutive successes.</p>
                </div>`,

                `<div class='parent'>
                  <p>To build winning streaks, you'll try to activate the gray tile below.</br>
                  Activating the tile multiple times in a row creates a winning streak.</p>
                  <div class='box' style='background-color:gray'></div>
                </div>`,

                `<div class='parent'>
                  <p>The tile will appear on your screen, then quickly disappear. To activate it, you must press your SPACEBAR 
                  before it disappears; whenever you see the tile, you should press your SPACEBAR as fast as possible.</p>
                  <div class='box' style='background-color:gray'></div>
                </div>`,

                `<div class='parent'>
                  <p>If you activate the tile, it will turn ${color}...</p>
                  <div class='box' style='background-color:${hex}'></div>
                </div>`,

                `<div class='parent'>
                  <p>...then you'll see the length of your current streak.</br>
                  For instance, if you activate the tile 3 times in a row, you'll see the following message:</p>
                  <div class="header" style="top:30%">Current Streak: 3</div>
                </div>`,
          ];
      };

      if (gameType == '1inN') {
          html = [
              `<div class='parent'>
                <p>The ${gameName} is played in multiple rounds.</p>
                <p>Your goal is to win each round.</p>
              </div>`,

              `<div class='parent'>
                <p>In each round, you'll have ${roundLength} chances to activate the grey tile below.</br>
                To win a round, you must activate the tile before your ${roundLength} chances are up.</p>
                <div class='box' style='background-color:gray'></div>
              </div>`,

              `<div class='parent'>
                <p>The tile will appear on your screen, then quickly disappear. To activate it, you must press your SPACEBAR 
                before it disappears; whenever you see the tile, you should press your SPACEBAR as fast as possible.</p>
                <div class='box' style='background-color:gray'></div>
              </div>`,

              `<div class='parent'>
                <p>If you activate the tile before your ${roundLength} chances are up, it will turn ${color}.</p>
                <div class='box' style='background-color:${hex}'></div>
              </div>`,

              `<div class='parent'>
                <p>If you respond too slowly, the tile will disappear without being activated.</p>
                <div class='box' style='background-color:white'></div>
              </div>`,

              `<div class='parent'>
                <p>To get a feel for the ${gameName}, you'll complete a practice session.</p>
                <p>Remember: Your goal is to win each round by activating the tile before your ${roundLength} chances are up.</p>
                <p>Once you proceed, the practice session will start, so get ready to press your SPACEBAR.</p>
              </div>`
          ];
      };

      if (gameType == 'bern') {
          html = [
              `<div class='parent'>
                <p>In the ${gameName}, your goal is to achieve successes.</p>
              </div>`,

              `<div class='parent'>
                <p>To achieve a success, you must activate the tile grey tile below.</p>
                <div class='box' style='background-color:gray'></div>
              </div>`,

              `<div class='parent'>
                <p>The tile will appear on your screen, then quickly disappear. To activate it, you must press your SPACEBAR 
                before it disappears; whenever you see the tile, you should press your SPACEBAR as fast as possible.</p>
                <div class='box' style='background-color:gray'></div>
              </div>`,

              `<div class='parent'>
                <p>If you activate the tile, it will turn ${color}.</p>
                <div class='box' style='background-color:${hex}'></div>
              </div>`,

              `<div class='parent'>
                <p>If you respond too slowly, the tile will disappear without being activated.</p>
                <div class='box' style='background-color:white'></div>
              </div>`,

              `<div class='parent'>
                <p>To get a feel for the ${gameName}, you'll complete a practice session.</p>
                <p>Remember: Your goal is to achieve successes by activating the tile.</p>
                <p>Once you proceed, the practice session will start, so get ready to press your SPACEBAR.</p>
              </div>`
          ];
      };

      return html;
  };

  obj.tileGame_howToEarn = function(gameType, gameName_1, gameName_2, pM, color, hex, roundLength, round) {

      let html;

      if (gameType == 'invStrk') {
        if (round == 1) {
          const fasterOrSlower = (pM < .5) ? "you'll have to respond faster than you did" : (pM > .5) ? "you won't have to respond as fast as you did" : "you'll have to respond just as fast as you did";
          const speed = (pM < .5) ? "less" : (pM > .5) ? "more" : "the same amount of";
          const asIn = (pM == .5) ? "as in" : "compared to";

          html = [`<div class='parent'>
                    <p>In the ${gameName_1}, points are based on the lengths of your miss streaks:</p>
                    <p><b>The shorter your miss streaks, the more points you'll earn.</b></p>
                    <p>Specifically, whenever you activate the tile, you'll earn 20 points minus 1 point for each consecutive miss.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>For example, if you activate the tile after 9 consecutive misses,<br>you'll see this message indicating that you earned 11 points.</p>    
                    <div class="header-win" style="top:20%; color:${hex}">Final Streak: 9</div>                           
                    <div class="token-text-win" style="color:${hex}">+11 Points</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you activate the tile after 0 misses,<br>you'll see this message indicating that you earned 20 points.</p>
                    <div class="header-win" style="top:20%; color:${hex}">Final Streak: 0</div>
                    <div class="token-text-win" style="color:${hex}">+20 Points</div>
                  </div>`,

                  `<div class='parent'>
                    <p>In the ${gameName_1}, players generally activate the tile about <b>${pM*100}%</b> of the time.</p>
                  </div>`];          
        } else if (round == 2) {
          const fasterOrSlower = (pM < .5) ? "you'll have to respond faster than you did" : (pM > .5) ? "you won't have to respond as fast as you did" : "you'll have to respond just as fast as you did";
          const speed = (pM < .5) ? "less" : (pM > .5) ? "more" : "the same amount of";
          const asIn = (pM == .5) ? "as in" : "compared to";
          html = [`<div class='parent' style='text-align: left'>
                    <p>The ${gameName_2} is identical to the ${gameName_1} with one exception:</p>
                    <p>You'll have <b>${speed} time</b> to activate the tile.</p>
                    <p>In the ${gameName_2}, players generally activate the tile about <b>${pM*100}%</b> of the time.</p>
                  </div>`,

                  `<div class='parent'>
                    <p>REMEMBER: Points are based on the lengths of your miss streaks:</p>
                    <p><b>The shorter your miss streaks, the more points you'll earn.</b></p>
                    <p>Specifically, whenever you activate the tile, you'll earn 20 points minus 1 point for each consecutive miss.</p>
                  </div>`,];
        };
      };

      if (gameType == 'strk') {
        if (round == 1) {
        const fasterOrSlower = (pM < .5) ? "you'll have to respond faster than you did" : (pM > .5) ? "you won't have to respond as fast as you did" : "you'll have to respond just as fast as you did";
          const speed = (pM < .5) ? "less" : (pM > .5) ? "more" : "the same amount of";
          const asIn = (pM == .5) ? "as in" : "compared to";

          html = [`<div class='parent'>
                    <p>Practice is now complete.</p>
                    <p>Now that you have a feel for the ${gameName_1}, you'll learn how to earn tokens.</p>
                    <p>Remember: The more tokens you earn, the better your chances of winning a $100.00 bonus.</p>
                  </div>`,

                  `<div class='parent'>
                    <p>In the ${gameName_1}, you'll earn tokens for <b>winning streaks</b>.</p>
                    <p>Specifically, to earn tokens in the ${gameName_1}, you must activate the tile as many times in a row as possible.</p>
                    <p>You'll earn 10 tokens for every consecutive tile you activate.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>For example, if you miss the tile after achieving a streak of 3,<br>you'll see this message indicating that you earned 30 tokens.</p>    
                    <div class="header-win" style="top:20%; color:${hex}">Final Streak: 3</div>                           
                    <div class="token-text-win" style="color:${hex}">+30 Tokens</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you miss the tile after failing to start a streak,<br>you'll see this message indicating that you earned 0 tokens.</p>
                    <div class="header-lose" style="top:20%">Final Streak: 0</div>
                    <div class="token-text-lose">+0 Tokens</div>
                  </div>`,

                  `<div class='parent'>
                    <p>In addition to earning tokens through your performance, you can gain or lose tokens randomly.</p>
                    <p>Specifically, at the end of each streak, you have a 20% chance of gaining 5 extra tokens,<br>and a 20% chance of losing 5 tokens.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you randomly win 5 extra tokens after a steak of 3, you'll see this message:</p>
                    <div class="header-win" style="top:20%; color:${hex}">Final Streak: 3</div>               
                    <div class="token-text-win" style="color:${hex}">+30 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you randomly lose 5 tokens after a steak of 3, you'll see this message:</p>
                    <div class="header-win" style="top:20%; color:${hex}">Final Streak: 3</div>               
                    <div class="token-text-win" style="color:${hex}">+30 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you randomly win 5 extra tokens after failing to start a streak, you'll see this message:</p>
                    <div class="header-lose" style="top:20%">Final Streak: 0</div>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you randomly lose 5 tokens after failing to start a streak, you'll see this message:</p>
                    <div class="header-lose" style="top:20%">Final Streak: 0</div>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`,

                  `<div class='parent'>
                    <p>In the ${gameName_1}, you'll have <b>${speed} time</b> to activate the tile ${asIn} the practice session.</p>
                    <p>Accordingly, ${fasterOrSlower} during practice.</p>
                  </div>`];          
        } else if (round == 2) {
          html = [`<div class='parent' style='text-align: left'>
                    <p>The ${gameName_2} is identical to the ${gameName_1} with one exception:</p>
                    <p>Instead of earning tokens for each individual success, you'll earn tokens for <b>streaks of consecutive successes</b>.</p>
                    <p>Specifically, in the ${gameName_2}, your goal is to activate the tile as many times in a row as possible.</p>
                    <p>You'll earn 10 tokens for every consecutive tile you activate.</p>
                  </div>`,

                  `<div class='parent'>
                    <p>Each time you activate the tile in the ${gameName_2}, you'll see the length of your current streak.</br>
                    For example, if you activate the tile 3 times in a row, you'll see the following message:</p>
                    <div class="header" style="top:30%">Current Streak: 3</div>
                  </div>`,

                  `<div class='parent'>
                    <p>After missing a tile, you'll see how many tokens you earned from your streak.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>For example, if you miss the tile after achieving a streak of 3,<br>you'll see this message indicating that you earned 30 tokens.</p>
                    <div class="header-win" style="top:20%; color:${hex}">Final Streak: 3</div>               
                    <div class="token-text-win" style="color:${hex}">+30 Tokens</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you miss the tile after failing to start a streak,<br>you'll see this message indicating that you earned 0 tokens.</p>
                    <div class="header-lose" style="top:20%">Final Streak: 0</div>
                    <div class="token-text-lose">+0 Tokens</div>
                  </div>`,

                  `<div class='parent'>
                    <p>At the end of each streak, you have a 20% chance of gaining 5 extra tokens,<br>and a 20% chance of losing 5 tokens.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you randomly win 5 extra tokens after a steak of 3, you'll see this message:</p>
                    <div class="header-win" style="top:20%; color:${hex}">Final Streak: 3</div>               
                    <div class="token-text-win" style="color:${hex}">+30 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you randomly lose 5 tokens after a steak of 3, you'll see this message:</p>
                    <div class="header-win" style="top:20%; color:${hex}">Final Streak: 3</div>               
                    <div class="token-text-win" style="color:${hex}">+30 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you randomly win 5 extra tokens after failing to start a streak, you'll see this message:</p>
                    <div class="header-lose" style="top:20%">Final Streak: 0</div>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you randomly lose 5 tokens after failing to start a streak, you'll see this message:</p>
                    <div class="header-lose" style="top:20%">Final Streak: 0</div>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`,];
        };

      };

      if (gameType == '1inN') {
        if (round == 1) {
          const fasterOrSlower = (pM == .1) ? "you'll have to respond faster than you did" : "you won't have to respond as fast as you did";
          const speed = (pM < .5) ? "less" : (pM > .5) ? "more" : "the same amount of";
          const asIn = (pM == .5) ? "as in" : "compared to";
          html = [`<div class='parent'>
                    <p>Practice is now complete.</p>
                    <p>Now that you have a feel for the ${gameName_1}, you'll learn how to earn tokens.</p>
                    <p>Remember: The more tokens you earn, the better your chances of winning a $100.00 bonus.</p>
                  </div>`,

                  `<div class='parent'>
                    <p>In the ${gameName_1}, players earn 10 tokens for every round they win.</p>
                    <p>Players earn 0 tokens for every round they lose.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you lose a round, you'll see this message indicating that you earned 0 tokens.</p>
                    <div class="token-text-lose">+0 Tokens</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you win a round, you'll see this message indicating that you earned 10 tokens.</p>                
                    <div class="token-text-win" style="color:${hex}">+10 Tokens</div>
                  </div>`,

                  `<div class='parent'>
                    <p>In addition to earning tokens through your performance,<br>you can gain (or lose) tokens randomly.</p>
                    <p>Specifically, at the end of each round,<br>you have a 20% chance of gaining 5 extra tokens, and a 20% chance of losing 5 tokens.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you lose a round and win 5 extra tokens, you'll see this message:</p>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you lose a round and lose 5 tokens, you'll see this message:</p>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you win a round and win 5 extra tokens, you'll see this message:</p>
                    <div class="token-text-win" style="color:${hex}">+10 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you win a round and lose 5 tokens, you'll see this message:</p>
                    <div class="token-text-win" style="color:${hex}">+10 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`,

                 `<div class='parent'>
                    <p>In the ${gameName_1}, you'll have <b>${speed} time</b> to activate the tile ${asIn} the practice session.</p>
                    <p>Accordingly, ${fasterOrSlower} during practice.</p>
                  </div>`];
        } else if (round == 2) {
          html = [`<div class='parent' style='text-align: left'>
                    <p>The ${gameName_2} is identical to the ${gameName_1} with one exception:</p>
                    <p>In each round of the ${gameName_2}, you'll have ${roundLength} chances to activate the grey tile.</p>
                    <p>Accordingly, your goal in the ${gameName_2} is not to activate each and every tile.<br>
                    Instead, your goal is to win each round by activating the tile before your ${roundLength} chances are up.</p>
                  </div>`];          
        };
      };

      if (gameType == 'bern') {
        const fasterOrSlower = (pM < .5) ? "you'll have to respond faster than you did" : (pM > .5) ? "you won't have to respond as fast as you did" : "you'll have to respond just as fast as you did";
        const speed = (pM < .5) ? "less" : (pM > .5) ? "more" : "the same amount of";
        const asIn = (pM == .5) ? "as in" : "compared to";

        if (round == 1) {
          html = [`<div class='parent'>
                    <p>Practice is now complete.</p>
                    <p>Now that you have a feel for the ${gameName_1}, you'll learn how to earn tokens.</p>
                    <p>Remember: The more tokens you earn, the better your chances of winning a $100.00 bonus.</p>
                  </div>`,

                  `<div class='parent'>
                    <p>In the ${gameName_1}, you'll earn tokens for <b>every tile you activate</b>.</p>
                    <p>Specifically, for every tile you activate, you'll earn 10 tokens.</p>
                    <p>You'll earn 0 tokens for every tile you miss.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you activate a tile, you'll see this message indicating that you earned 10 tokens.</p>                
                    <div class="token-text-win" style="color:${hex}">+10 Tokens</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you miss a tile, you'll see this message indicating that you earned 0 tokens.</p>
                    <div class="token-text-lose">+0 Tokens</div>
                  </div>`,

                  `<div class='parent'>
                    <p>In addition to earning tokens through your performance,<br>you can gain or lose tokens randomly.</p>
                    <p>Specifically, at the end of each round, you have a 20% chance of gaining 5 extra tokens,<br>and a 20% chance of losing 5 tokens.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you activate a tile and win 5 extra tokens, you'll see this message:</p>
                    <div class="token-text-win" style="color:${hex}">+10 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you activate a tile and lose 5 tokens, you'll see this message:</p>
                    <div class="token-text-win" style="color:${hex}">+10 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you miss a tile and win 5 extra tokens, you'll see this message:</p>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you miss a tile and lose 5 tokens, you'll see this message:</p>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`,

                 `<div class='parent'>
                      <p>In the ${gameName_1}, you'll have <b>${speed} time</b> to activate the tile compared to the practice session.</p>
                      <p>Accordingly, ${fasterOrSlower} during practice.</p>
                  </div>`];
        } else if (round == 2) {
          html = [`<div class='parent' style='text-align: left'>
                    <p>The ${gameName_2} is identical to the ${gameName_1} with one exception:</p>
                    <p>Instead of earning tokens for streaks, you'll earn tokens for <b>each individual tile you activate</b>.</p>
                    <p>Specifically, for each individual tile you activate, you'll win 10 tokens.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you activate a tile, you'll see this message indicating that you earned 10 tokens.</p>                
                    <div class="token-text-win" style="color:${hex}">+10 Tokens</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you miss a tile, you'll see this message indicating that you earned 0 tokens.</p>
                    <div class="token-text-lose">+0 Tokens</div>
                  </div>`,

                  `<div class='parent'>
                    <p>After each tile, you have a 20% chance of gaining 5 extra tokens,<br>and a 20% chance of losing 5 tokens.</p>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you activate a tile and win 5 extra tokens, you'll see this message:</p>
                    <div class="token-text-win" style="color:${hex}">+10 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you activate a tile and lose 5 tokens, you'll see this message:</p>
                    <div class="token-text-win" style="color:${hex}">+10 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you miss a tile and win 5 extra tokens, you'll see this message:</p>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="bonus-text">+5 Bonus</div>
                  </div>`,

                  `<div class='parent' style='height: 550px'>
                    <p>If you miss a tile and lose 5 tokens, you'll see this message:</p>
                    <div class="token-text-lose">+0 Tokens</div>
                    <div class="penalty-text">-5 Loss</div>
                  </div>`];
        };
      };  

      return html;
  };

  obj.preTask_tileGame = function() {
      const html = [`<div class='parent'>
          <p>You are now ready to play the Tile Game.</p>
          <p>Once you proceed, the Tile Game will start, so get ready to press your SPACEBAR.</p>
          <p>Continue to begin.</p>
          </div>`];
      return html;
  };

  obj.intro_raceForPrize = function({firstTaskName, effort, carSize, attnChkVars, correctAnswers}) {

    // html chunks for instructions
    const trackImg = `<div style="position:relative; left: 0; right: 0; width: 500px; height: 250px; margin:auto; background: #D3D3D3">
      <div style="position:absolute; top:50px; left:50px">
          <img src="img/myCar.png" style="height:${carSize[0]}px; width:${carSize[1]}px"></img>
      </div>
      <div style="position:absolute; top:${250-carSize[0]-50}px; left:50px">
          <img src="img/theirCar.png" style="height:${carSize[0]}px; width:${carSize[1]}px"></img>
      </div>
      <div style="position:absolute; left:450px; height: 100%; width:5px; background:black">
      </div></div>`;

    const trackImg_pressLeft = `<div style="position:relative; left: 0; right: 0; width: 500px; height: 250px; margin:auto; background: #D3D3D3">
      <div style="position:absolute; top:50px; left:50px">
          <img src="img/myCar.png" style="height:${carSize[0]}px; width:${carSize[1]}px"></img>
      </div>
      <div style="position:absolute; top:${250-carSize[0]-50}px; left:50px">
          <img src="img/theirCar.png" style="height:${carSize[0]}px; width:${carSize[1]}px"></img>
      </div>
      <div style="position:absolute; left:450px; height: 100%; width:5px; background:black">
      </div>
      <div style="position:absolute; top:75px; left:-80px">
        <p id="left-button" style="height:100px; width:50px; background:#b0fc38; border-style:solid; border-width:3px; border-color:black; display:table-cell; vertical-align:middle; margin-left:auto; font-size: 40px; margin-right:auto">E</p>
      </div>
      <div style="position:absolute; top:75px; width: 50px; left:530px">
        <p id="right-button" style="height:100px; width:50px; background:white; border-style:solid; border-width:3px; border-color:black; display:table-cell; vertical-align:middle; margin-left:auto; font-size: 40px; margin-right:auto">I</p>
      </div></div>`;

    const trackImg_pressRight = `<div style="position:relative; left: 0; right: 0; width: 500px; height: 250px; margin:auto; background: #D3D3D3">
      <div style="position:absolute; top:50px; left:50px">
          <img src="img/myCar.png" style="height:${carSize[0]}px; width:${carSize[1]}px"></img>
      </div>
      <div style="position:absolute; top:${250-carSize[0]-50}px; left:50px">
          <img src="img/theirCar.png" style="height:${carSize[0]}px; width:${carSize[1]}px"></img>
      </div>
      <div style="position:absolute; left:450px; height: 100%; width:5px; background:black">
      </div>
      <div style="position:absolute; top:75px; left:-80px">
        <p id="left-button" style="height:100px; width:50px; background:white; border-style:solid; border-width:3px; border-color:black; display:table-cell; vertical-align:middle; margin-left:auto; font-size: 40px; margin-right:auto">E</p>
      </div>
      <div style="position:absolute; top:75px; width: 50px; left:530px">
        <p id="right-button" style="height:100px; width:50px; background:#b0fc38; border-style:solid; border-width:3px; border-color:black; display:table-cell; vertical-align:middle; margin-left:auto; font-size: 40px; margin-right:auto">I</p>
      </div></div>`;

    const trackImg_pressNeither = `<div style="position:relative; left: 0; right: 0; width: 500px; height: 250px; margin:auto; background: #D3D3D3">
      <div style="position:absolute; top:50px; left:50px">
          <img src="img/myCar.png" style="height:${carSize[0]}px; width:${carSize[1]}px"></img>
      </div>
      <div style="position:absolute; top:${250-carSize[0]-50}px; left:50px">
          <img src="img/theirCar.png" style="height:${carSize[0]}px; width:${carSize[1]}px"></img>
      </div>
      <div style="position:absolute; left:450px; height: 100%; width:5px; background:black">
      </div>
      <div style="position:absolute; top:75px; left:-80px">
        <p id="left-button" style="height:100px; width:50px; background:white; border-style:solid; border-width:3px; border-color:black; display:table-cell; vertical-align:middle; margin-left:auto; font-size: 40px; margin-right:auto">E</p>
      </div>
      <div style="position:absolute; top:75px; width: 50px; left:530px">
        <p id="right-button" style="height:100px; width:50px; background:white; border-style:solid; border-width:3px; border-color:black; display:table-cell; vertical-align:middle; margin-left:auto; font-size: 40px; margin-right:auto">I</p>
      </div></div>`;

    let effortMsg, practiceMsg, prompt_attnChk1;

    if (effort == 'high') {
      effortMsg = [`<div class='parent'>
        <p>To accelerate your car, you must press your E-key, then your I-key, one after the other.<br>
        You'll need to press your keys as fast as possible in order to reach top speed.</p>
        ${trackImg}              
        </div>`,

        `<div class='parent'>
        <p>On the sides of your screen,<br>
        you'll see cues that tell you which key to press.</p>
        ${trackImg_pressNeither}              
        </div>`];

      practiceMsg = [`<div class='parent'>
        <p>To get a feel for Race for the Prize, you'll complete two practice runs.</p>
        <p>In the practice runs, you will not race against an opponent.<br>
        You will simply practice accelerating by pressing the appropriate keys as fast as possible.</p>
        </div>`];

      prompt_attnChk1 = `In order to reach top speed, I'll have to press my keys as fast as possible.`;
    };

    if (effort == 'low') {
      effortMsg = [`<div class='parent'>
        <p>To accelerate your car, you must press your E-key, then your I-key, one after the other.<br>
        You'll need to press each key at just the right moment in order to reach top speed.</p>
        ${trackImg}              
        </div>`,

        `<div class='parent'>
        <p>On the sides of your screen,<br>
        you'll see cues that tell you when to press each key.</p>
        ${trackImg_pressNeither}              
        </div>`];

      practiceMsg = [`<div class='parent'>
        <p>To get a feel for Race for the Prize, you'll complete two practice runs.</p>
        <p>In the practice runs, you will not race against an opponent.<br>
        You will simply practice accelerating by pressing the appropriate keys as just the right moment.</p>
        </div>`];

      prompt_attnChk1 = `In order to reach top speed, I'll have to press my keys at just the right moment.`;

    };

    // instructions
    const html = [`<div class='parent'>
      <p>Race for the Prize is played in multiple rounds.</p>
      </div>`,

      `<div class='parent'>
      <p>In each round, you'll race your car against an opponent.<br>
      You'll be driving the red car. Your opponent will be driving the blue car.</p>
      ${trackImg}
      </div>`,

      `<div class='parent'>
      <p>Each time you beat your opponent across the finish line, your victory will be celebrated with a fireworks display!</br>
      For each race, your goal is to win a fireworks display by beating your opponent.</p>
      ${trackImg}
      </div>`,

      `<div class='parent'>
      <p>In Race for the Prize, players typically win about ${correctAnswers[1]} of their races.</p>
      <p>To maximize <em>your</em> chances of winning, pay close attention to the upcoming information!</p>
      </div>`,

      `<div class='parent'>
      <p>To beat your opponent, you'll need to accelerate your car.<br>
      &nbsp</p>
      ${trackImg}
      </div>`,

      ...effortMsg,

      `<div class='parent'>
      <p>When you need to press your E-key,<br>
      the cue on the left will light up like this:</p>
      ${trackImg_pressLeft}
      </div>`,

      `<div class='parent'>
      <p>When you need to press your I-key,<br>
      the cue on the right will light up like this:</p>
      ${trackImg_pressRight}
      </div>`];

    // attention check loop

    const inst = {
      type: jsPsychInstructions,
      pages: html,
      show_clickable_nav: true,
    };

    const prePractice = {
      type: jsPsychInstructions,
      pages: practiceMsg,
      show_clickable_nav: true,
    };

    const preInstructions = {
      type: jsPsychInstructions,
      pages: [`<div class='parent'>
      <p>Thank you for playing ${firstTaskName}!</p>
      <p>Next, you'll play a different game called Race for the Prize.</p>
      <p>When you're ready, please continue.</p></div>`],
      show_clickable_nav: true,
    }

    const errorMessage = {
      type: jsPsychInstructions,
      pages: [`<div class='parent'><p>You provided the wrong answer.<br>To make sure you understand the game, please continue to re-read the instructions.</p></div>`],
      show_clickable_nav: true,
    };

    const attnChk = {
      type: jsPsychSurveyMultiChoice,
      preamble: `<div style="font-size:16px"><p>To make sure you understand Race for the Prize, please indicate whether the following statement is true or false:</p></div>`,
      questions: [
        {
          prompt: prompt_attnChk1, 
          name: "attnChk1", 
          options: ["True", "False"],
        },
        {
          prompt: `What percentage of races do most players win?`, 
          name: "attnChk2", 
          options: ["0%", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"],
        },
      ],
      scale_width: 500,
      on_finish: (data) => {
          const totalErrors = obj.getTotalErrors(data, correctAnswers);
          data.totalErrors = totalErrors;
      },
    };

    let showIntro = true;

    const conditionalNode1 = {
      timeline: [preInstructions],
      conditional_function: () => {
        return showIntro;
      },
    };

    const conditionalNode2 = {
      timeline: [errorMessage],
      conditional_function: () => {
        const fail = jsPsych.data.get().last(1).select('totalErrors').sum() > 0 ? true : false;
        if (fail) { showIntro = false };
        return fail;
      },
    };

    const instLoop = {
      timeline: [conditionalNode1, inst, attnChk, conditionalNode2],
      loop_function: () => {
        const fail = jsPsych.data.get().last(2).select('totalErrors').sum() > 0 ? true : false;
        return fail;
      },
    };

    this.timeline = [instLoop, prePractice];

  };

  obj.postPractice_raceForPrize = function({firstTaskName, effort, carSize, attnChkVars, correctAnswers}) {

    const html = [`<div class='parent'>
      <p>Practice is now complete. Next, you'll race against your opponent!</p>
      <p>Remember: Your goal for each race is to win a fireworks display by beating your opponent.</p>
      <p>Continue when you're ready to race.</p></div>`];

    this.type = jsPsychInstructions;
    this.pages = html;
    this.show_clickable_nav = true;

  };

  return obj

}());