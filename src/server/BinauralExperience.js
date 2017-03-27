import { Experience } from 'soundworks/server';

/**
 * 
 */
export default class SoundfieldExperience extends Experience {
  /**
   * @param {Array} clientTypes - The client types the experience should be binded.
   */
  constructor(clientTypes) {
    super(clientTypes);
  }

  /**
   * Function called whenever a client enters its `Experience`.
   */
  enter(client) {
    super.enter(client);
  }

  /**
   * Function called whenever a client exits its `Experience`.
   */
  exit(client) {
    super.exit(client);
  }

}
