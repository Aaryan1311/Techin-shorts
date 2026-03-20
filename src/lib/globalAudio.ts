/**
 * Global audio manager — ensures only one audio plays at a time across the app.
 * Any component can call globalAudio.play(src) and it will stop whatever
 * was playing before. Components register stop callbacks to reset their UI.
 */

let currentAudio: HTMLAudioElement | null = null;
let currentStopCallback: (() => void) | null = null;

export const globalAudio = {
  /**
   * Play audio from the given src. Stops any currently playing audio first.
   * Returns the HTMLAudioElement for the caller to attach onended/onerror.
   */
  play(src: string, onStop: () => void): HTMLAudioElement {
    // Stop current playback
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
    }
    if (currentStopCallback) {
      currentStopCallback();
    }

    if (!currentAudio) {
      currentAudio = new Audio();
    }

    currentAudio.src = src;
    currentStopCallback = onStop;
    return currentAudio;
  },

  /**
   * Stop whatever is currently playing and notify the component.
   */
  stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
    }
    if (currentStopCallback) {
      currentStopCallback();
      currentStopCallback = null;
    }
  },

  /**
   * Stop only if the given callback matches the current one.
   * Used by components to stop only their own audio.
   */
  stopIfOwner(onStop: () => void) {
    if (currentStopCallback === onStop) {
      this.stop();
    }
  },
};
