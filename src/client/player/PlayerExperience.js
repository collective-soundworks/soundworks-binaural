import * as soundworks from 'soundworks/client';
import SpatSourcesHandler from './SpatSourcesHandler';
import AudioPlayer from './AudioPlayer';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

// html template used by `View` of the `PlayerExperience`
const template = `
  <div class="section-top"></div>
  <div class="section-center flex-center">
    <p class="big"><%= center %></p>
  </div>
  <div class="section-center flex-center">
    <p id="value0" class="big"><%= 'NaN' %></p>
    <p id="value1" class="big"><%= 'NaN' %></p>
    <p id="value2" class="big"><%= 'NaN' %></p>
  </div>
  <div class="section-bottom"></div>
`;

/**
 * Player Experience
 */
export default class PlayerExperience extends soundworks.Experience {
  constructor(audioFiles) {
    super();

    // services
    this.require('platform', { features: 'web-audio' });
    this.motionInput = this.require('motion-input', { descriptors: ['accelerationIncludingGravity', 'deviceorientation'] });
    this.loader = this.require('loader', { files: audioFiles });

    // bind
    this.onPlayMessage = this.onPlayMessage.bind(this);
    this.playSound = this.playSound.bind(this);
    this.cart2sph = this.cart2sph.bind(this);
    this.setIntervalCallback = this.setIntervalCallback.bind(this);

    // local parameters
    this.counter_limitInput = 0;
    this.orientation_offset = [0,0,0];
  }

  /**
   * Initialize the experience when all services are ready.
   */
  init() {
    // init local parameters
    this.spatSourceHandler = new SpatSourcesHandler(this.loader.buffers[0]);
    this.localAudioPlayer = new AudioPlayer();

    // configure and instanciate the view of the experience
    this.viewContent = { center: 'Keep your head and cellphone aligned. Touch to reset orientation. Shake to send sound'};
    this.viewTemplate = template;
    this.viewCtor = soundworks.SegmentedView;
    this.view = this.createView();
  }

  /**
   * Start the experience when all services are ready.
   */
  start() {
    super.start();

    // if the experience has never started, initialize it
    if (!this.hasStarted)
      this.init();

    // request the `viewManager` to display the view of the experience
    this.show();
    // setup socket listeners for server messages
    this.receive('play', this.onPlayMessage);

    // setup motion input listeners (play spatialized sound on shake)
    if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
      this.motionInput.addListener('accelerationIncludingGravity', (data) => {

          // get acceleration data
          const mag = Math.sqrt(data[0] * data[0] + data[1] * data[1] + data[2] * data[2]);

          // play sound on shaking (+ limit inputs)
          if (mag > 20 && this.counter_limitInput > 5) {
            // reset limit timer
            this.counter_limitInput = 0;
            // play sound
            this.playSound();
          }

      });
    }

    // setup motion input listeners
    if (this.motionInput.isAvailable('deviceorientation')) {
      this.motionInput.addListener('deviceorientation', (data) => {
        // display orientation info on screen
        data[0] -= this.orientation_offset[0];
        data[1] -= this.orientation_offset[1];
        data[2] -= this.orientation_offset[2];
        document.getElementById("value0").innerHTML = Math.round(data[0]*10)/10;
        document.getElementById("value1").innerHTML = Math.round(data[1]*10)/10;
        document.getElementById("value2").innerHTML = Math.round(data[2]*10)/10;
        // store orientation info
        this.spatSourceHandler.setListenerOrientation([-data[0],0,-1])
      });
    }

    // create touch event source referring to our view
    const surface = new soundworks.TouchSurface(this.view.$el);
    // setup touch listeners (reset orientation on touch)
    surface.addListener('touchstart', (id, normX, normY) => {
      if (this.counter_limitInput > 0){
        // reset timer
        this.counter_limitInput = 0;
        // store local orientation
        this.orientation_offset = this.spatSourceHandler.getListenerOrientation();
      }
    });

    // create game loop callback
    const frameRate = 100; // setInterval loop repeated every ... ms
    window.setInterval(this.setIntervalCallback, frameRate);
  }

  playSound(){
    // play local sound
    const gainLvl = 1.0;
    this.localAudioPlayer.playSound(this.loader.buffers[1], gainLvl);
    // inform server
    this.send('play');
  }

  setIntervalCallback() {
    // update timers
      this.counter_limitInput += 1;
  }

  /**
   * Callback to be executed when receiving the `play` message from the server.
   */
  onPlayMessage(coords) {
    var rel_pos_cart = [coords[0] - client.coordinates[0], coords[1] - client.coordinates[1], 0];
    var rel_pos_sph = this.cart2sph(rel_pos_cart);
    rel_pos_sph = [ rel_pos_sph[0] - this.orientation_offset[0],
                    rel_pos_sph[2] - this.orientation_offset[2],
                    rel_pos_sph[2] - this.orientation_offset[2] ];

    this.spatSourceHandler.playSound(this.loader.buffers[1], rel_pos_sph);
  }

  cart2sph(xyz){
    var dist = Math.sqrt(Math.pow(xyz[0],2) + Math.pow(xyz[1],2) + Math.pow(xyz[2],2));
    var azim = Math.acos(xyz[2]/dist);
    var elev = Math.atan(xyz[1]/xyz[0]);
    var aed = [azim, elev, dist];
    return aed
  }
}
