import "./onboarding.scss";
import Onboarding from '../../../bpl-tools/Admin/Onboarding';
import { onboardingInfo } from "./utils/onboarding";
import { dashboardInfo } from "./utils/data";

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('h5vpOnboarding');
  if (!el) return;

  const info = JSON.parse(el?.dataset?.info || '{}');
  const { adminUrl = '', dashboardUrl = '', ajaxAction = '', nonce = '', values = {} } = info;

  let currentEditor = values.editor || '';

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.choiceCard');
    if (card) {
      const text = (card.querySelector('.choiceLabel')?.textContent || card.textContent || '').toLowerCase();
      if (text.includes('shortcode')) {
        currentEditor = 'shortcode';
      } else if (text.includes('gutenberg')) {
        currentEditor = 'gutenberg';
      } else if (text.includes('elementor')) {
        currentEditor = 'elementor';
      }
    }
  });

  const getSelectedEditor = () => {
    if (currentEditor) return currentEditor;
    const selectedCard = document.querySelector('.choiceCard.selected, [role="radio"][aria-checked="true"]');
    if (selectedCard) {
      const text = (selectedCard.querySelector('.choiceLabel')?.textContent || selectedCard.textContent || '').toLowerCase();
      if (text.includes('shortcode')) return 'shortcode';
      if (text.includes('gutenberg')) return 'gutenberg';
      if (text.includes('elementor')) return 'elementor';
    }
    return '';
  };

  ReactDOM.createRoot(el).render(<Onboarding
    {...dashboardInfo(info)}
    steps={onboardingInfo()}
    values={values}
    ajaxAction={ajaxAction}
    nonce={nonce}
    exitUrl={dashboardUrl}
    finishButton={{
      label: 'Create Your First Player',
      get url() {
        const editor = getSelectedEditor();
        if (editor === 'elementor') {
          return `${adminUrl}edit.php?post_type=page`;
        }
        if (editor === 'gutenberg') {
          return `${adminUrl}post-new.php`;
        }
        return `${adminUrl}post-new.php?post_type=videoplayer`;
      }
    }}
  />);
});
