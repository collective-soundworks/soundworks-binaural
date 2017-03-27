import * as soundworks from 'soundworks/client';
import SpatSourcesHandler from './SpatSourcesHandler';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

// html template used by `View` of the `PlayerExperience`
const template = `
  <div class="section-top"></div>
  <div class="section-center flex-center">
    <p class="meidum"><%= center %></p>
  </div>
  <div class="section-center flex-center">
    <p id="value0" class="big"><%= 'NaN' %></p>
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

    // local parameters
    this.orientation_offset = [0,0,0];
    this.ori = [0,0,0];
  }

  /**
   * Initialize the experience when all services are ready.
   */
  init() {
    // init spat source handler
    this.spatSourceHandler = new SpatSourcesHandler();
    // start looping sound
    let pos = [1.0, 0.0, 1.0];
    this.spatSourceHandler.playSound(this.loader.buffers[0], pos, 0, true);

    // configure and instanciate the view of the experience
    this.viewContent = { center: 'Move device to move sound (azim only). <br> Touch to reset orientation.'};
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

    // setup motion input listeners
    if (this.motionInput.isAvailable('deviceorientation')) {
      this.motionInput.addListener('deviceorientation', (data) => {
        // get relative orientation
        data[0] -= this.orientation_offset[0];
        this.ori[0] = data[0];
        // display orientation info on screen
        document.getElementById("value0").innerHTML = Math.round(data[0]*10)/10 + '°';
        // set listnener orientation
        this.spatSourceHandler.setListenerOrientation([-data[0],0,-1])
      });
    }

    // create touch event source referring to our view
    const surface = new soundworks.TouchSurface(this.view.$el);
    // setup touch listeners (reset orientation on touch)
    surface.addListener('touchend', (id, normX, normY) => {
      this.orientation_offset[0] = this.ori[0];
    });

  }

}
