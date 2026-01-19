/**
 * Feature to hide YouTube comments section.
 * Provides comprehensive hiding with forced visibility restoration.
 */
class HideCommentsFeature extends DOMFeature {
  constructor() {
    super('hideComments', {
      defaultEnabled: false
    });
  }

  async onInit() {
    console.debug('FocusTube: HideCommentsFeature initialized');
  }

  async onActivate() {
    this.hideComments();
    this.observeDOM(() => this.hideComments());
  }

  async onDeactivate() {
    // Inject CSS to force visibility before calling parent cleanup
    this.injectVisibilityCSS();
    await super.onDeactivate();
  }

  /**
   * Hide all comments sections
   */
  hideComments() {
    const commentsElements = this.query('ytd-comments');
    this.hideElements(commentsElements);
    
    console.debug(`FocusTube: Hidden ${commentsElements.length} comment sections`);
  }

  /**
   * Inject CSS to force comments visibility (used on deactivation)
   */
  injectVisibilityCSS() {
    const css = `
      ytd-comments,
      ytd-comments #comments,
      ytd-comments #sections,
      ytd-item-section-renderer#sections {
        display: block !important;
        visibility: visible !important;
        width: auto !important;
        max-width: none !important;
        min-width: 0 !important;
        opacity: 1 !important;
      }
    `;
    this.injectCSS('visibility', css);
  }
}
