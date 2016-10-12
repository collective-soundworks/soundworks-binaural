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
 * The `PlayerExperience` requires the `players` to give its approximative
 * position into the `area` (see `src/server/index`) of the experience.
 * The device of the player is then remote controlled by another type of
 * client (i.e. `soloist`) that can control the `start` and `stop` of the
 * synthesizer from its own interface.
 */
export default class PlayerExperience extends soundworks.Experience {
  constructor(audioFiles) {
    super();

    // the experience requires the following services:
    // - the `platform` service checks for the availability of the requested
    //   features of the application, and display the home screen of the
    //   application
    this.require('platform', { features: 'web-audio' });
    // - the `locator` service provide a view asking for the approximative
    //   position of the user in the defined `area`
    this.locator = this.require('locator');
    // - the `motionInput` service provides an access to the device input
    // such as accelerationIncludingGravity or deviceorientation
    this.motionInput = this.require('motion-input', { descriptors: ['accelerationIncludingGravity', 'deviceorientation'] });
    // - the `loader` service simplifies audio files loading
    this.loader = this.require('loader', { files: audioFiles });

    // bind methods to the instance to keep a safe `this` in callbacks
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

    // setup motion input listeners
    if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
      this.motionInput.addListener('accelerationIncludingGravity', (data) => {

          // get acceleration data
          const mag = Math.sqrt(data[0] * data[0] + data[1] * data[1] + data[2] * data[2]);

          // play sound on shaking
          if (mag > 20 && this.counter_limitInput > 5) {
            // reset timer
            this.counter_limitInput = 0;
            // play sound
            this.playSound();
          }

      });
    }

    // setup motion input listeners
    if (this.motionInput.isAvailable('deviceorientation')) {
      this.motionInput.addListener('deviceorientation', (data) => {
        // display info on screen
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
    // setup touch listeners
    surface.addListener('touchstart', (id, normX, normY) => {
      if (this.counter_limitInput > 0){
        // reset timer
        this.counter_limitInput = 0;
        // store local orientation
        this.orientation_offset = this.spatSourceHandler.getListenerOrientation();
        // play sound
        // this.playSound();
      }
    });

    // create game loop timer
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
    // console.log('coods: me ', client.coordinates)
    // console.log('coods: him', coords)
    var rel_pos_cart = [coords[0] - client.coordinates[0], coords[1] - client.coordinates[1], 0];
    // console.log('coods: rel', rel_pos);
    var rel_pos_sph = this.cart2sph(rel_pos_cart);
    rel_pos_sph = [ rel_pos_sph[0] - this.orientation_offset[0],
                    rel_pos_sph[2] - this.orientation_offset[2],
                    rel_pos_sph[2] - this.orientation_offset[2]
                  ];

    // if (this.motionInput.isAvailable('deviceorientation')) {
    //   rel_pos[0] = Math.cos(this.orientation[0] * (Math.PI / 180)) * rel_pos[0]
    //              + Math.sin(this.orientation[1] * (Math.PI / 180)) * rel_pos[1];
    //   rel_pos[1] = Math.cos(this.orientation[0] * (Math.PI / 180)) * rel_pos[1]
    //              + Math.sin(this.orientation[1] * (Math.PI / 180)) * rel_pos[0];
    //   console.log('coods: rel', rel_pos);
    // }
    // document.getElementById("value0").innerHTML = Math.round(rel_pos[0]*10)/10;
    // document.getElementById("value1").innerHTML = Math.round(rel_pos[1]*10)/10;
    // document.getElementById("value2").innerHTML = Math.round(rel_pos[2]*10)/10;


    // rel_pos = [-1,0, 0]; // [-left +right, -back + front, ..]
    // rel_pos = [rel_pos[0],rel_pos[1],0];
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
