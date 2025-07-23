/**
 * jspsych-canvas-keyboard-response
 * Chris Jungerius (modified from Josh de Leeuw)
 *
 * a jsPsych plugin for displaying a canvas stimulus and getting a keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/


var dmPsychHoleInOne = (function (jspsych) {
  'use strict';

  const info = {
    name: 'hole-in-one-game',
    description: '',
    parameters: {
      // The drawing function to apply to the canvas. Should take the canvas object as argument
      stimulus: {
        type: jspsych.ParameterType.FUNCTION,
        pretty_name: 'Stimulus',
        default: undefined,
      },
      // Any content here will be displayed below the stimulus
      prompt: {
        type: jspsych.ParameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
      },
      // Number of shots before the game ends
      total_shots: {
        type: jspsych.ParameterType.INT,
        pretty_name: 'Number of shots',
        default: null,
      },
      // How long to show trial before it ends
      trial_duration: {
        type: jspsych.ParameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
      },
      // Array containing the height (first value) and width (second value) of the canvas element
      canvas_size: {
        type: jspsych.ParameterType.INT,
        array: true,
        pretty_name: 'Canvas size',
        default: [500, 500],
      },
      // Color of the ball in the slingshot game
      ball_color: {
        type: jspsych.ParameterType.STRING,
        pretty_name: 'Color of the ball',
        default: 'blue',
      },
      // Ball position on x axis in terms of percent from left
      ball_xPos: {
        type: jspsych.ParameterType.FLOAT,
        pretty_name: 'Ball position on x axis',
        default: .15,
      },
      // Ball position on y axis in terms of percent from top
      ball_yPos: {
        type: jspsych.ParameterType.FLOAT,
        pretty_name: 'Ball position on y axis',
        default: .5,
      },
      // Radius of the ball in pixels
      ball_size: {
        type: jspsych.ParameterType.INT,
        pretty_name: 'Size of the ball',
        default: 10,
      },
      // Width of the wall in pixels
      wall_width: {
        type: jspsych.ParameterType.STRING,
        pretty_name: 'Width of the wall',
        default: 75,
      },
      // Color of the wall in the hold in one game
      wall_color: {
        type: jspsych.ParameterType.STRING,
        pretty_name: 'Color of the wall',
        default: '#797D7F',
      },
      // Wall position on x axis in terms of percent from left
      wall_xPos: {
        type: jspsych.ParameterType.FLOAT,
        pretty_name: 'Wall position on x axis',
        default: .8,
      },
      // Size of the hole in pixels
      hole_size: {
        type: jspsych.ParameterType.INT,
        pretty_name: 'Hole size',
        default: 100,
      },
      // Amount of drag applies to ball as it flies
      friction: {
        type: jspsych.ParameterType.FLOAT,
        pretty_name: 'Air friction',
        default: .02,
      },
      // Stiffness of the spring
      tension: {
        type: jspsych.ParameterType.FLOAT,
        pretty_name: 'Spring tension',
        default: .03,
      },
      /** If true, the subject can use keyboard keys to navigate the pages. */
      allow_keys: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: "Allow keys",
        default: false,
      },
    },
  };

  class HoleInOnePlugin {
    constructor(jsPsych) {
        this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {

      var new_html = '<div id="jspsych-canvas-keyboard-response-stimulus">' + '<canvas id="jspsych-canvas-stimulus" height="' + trial.canvas_size[0] + '" width="' + trial.canvas_size[1] + '"></canvas>' + '</div>';
      
      // add prompt
      if (trial.prompt !== null) {
        new_html = trial.prompt + new_html;
      }

      // draw
      display_element.innerHTML = new_html;
      let c = document.getElementById("jspsych-canvas-stimulus")
      let req
      trial.stimulus(c, trial);

      // function to end trial when it is time
      const endTrial = () => {

        // kill any remaining setTimeout handlers
        this.jsPsych.pluginAPI.clearAllTimeouts();

        // stop listening for last trial
        clearInterval(listenForLastTrial);
        cancelAnimationFrame(req);

        // kill keyboard listeners
        if (trial.allow_keys) {
            this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboard_listener);
        }

        // gather the data to store for the trial
        var trial_data = {
          totalTrials: dmPsych.holeInOne.data.totalTrials,
          totalScore: dmPsych.holeInOne.data.totalScore,
          xLocBall: dmPsych.holeInOne.data.ballX,
          yLocBall: dmPsych.holeInOne.data.ballY
        };

        // clear the display
        display_element.innerHTML = '';

        // move on to the next trial
        this.jsPsych.finishTrial(trial_data);
      };

      // listen for last trial of slingshot game
      var listenForLastTrial = setInterval(function () { if (dmPsych.holeInOne.data.totalTrials == trial.total_shots) endTrial() }, 200)

      // end trial if trial_duration is set
      if (trial.trial_duration !== null) {
        jsPsych.pluginAPI.setTimeout(function () {
          end_trial();
        }, trial.trial_duration);
      }
    };
  };

  HoleInOnePlugin.info = info;

  return HoleInOnePlugin;

})(jsPsychModule);
