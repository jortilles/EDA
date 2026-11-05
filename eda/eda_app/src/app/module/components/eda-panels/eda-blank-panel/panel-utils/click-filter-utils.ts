/**
 * Shared logic for the per-panel, bilateral click-filter (dynamic filter) configuration.
 * A panel decides which other panels its click affects (clickFilterApplyToAll / clickFilterTargets),
 * and that relation can also be edited from the "affected" side (bilateral connection).
 */
export const ClickFilterUtils = {

  /**
   * Whether sourcePanel's click currently affects targetId.
   */
  affectsPanel: (sourcePanel: any, targetId: string): boolean => {
    if (!sourcePanel || sourcePanel.clickFiltersEnabled === false) return false;
    if (sourcePanel.clickFilterApplyToAll !== false) return true;
    return (sourcePanel.clickFilterTargets || []).includes(targetId);
  },

  /**
   * Panels (other than panelId) whose click currently affects panelId.
   */
  getAffectingPanels: (allPanels: any[], panelId: string): any[] => {
    return (allPanels || []).filter((p: any) =>
      p.id !== panelId && ClickFilterUtils.affectsPanel(p, panelId)
    );
  },

  /**
   * Edits sourcePanel so that affectsPanel(sourcePanel, targetId) === shouldAffect.
   * allOtherIds: ids of every other panel in the dashboard except sourcePanel itself.
   */
  setAffectsPanel: (sourcePanel: any, allOtherIds: string[], targetId: string, shouldAffect: boolean): void => {
    if (!sourcePanel) return;

    if (shouldAffect) {
      if (sourcePanel.clickFilterApplyToAll === false) {
        if (!sourcePanel.clickFilterTargets) sourcePanel.clickFilterTargets = [];
        if (!sourcePanel.clickFilterTargets.includes(targetId)) sourcePanel.clickFilterTargets.push(targetId);
      }
      // If applyToAll, it already affects targetId: nothing to do.
    } else {
      if (sourcePanel.clickFilterApplyToAll !== false) {
        sourcePanel.clickFilterApplyToAll = false;
        sourcePanel.clickFilterTargets = (allOtherIds || []).filter((id: string) => id !== targetId);
      } else {
        sourcePanel.clickFilterTargets = (sourcePanel.clickFilterTargets || []).filter((id: string) => id !== targetId);
      }
    }
  }

};
