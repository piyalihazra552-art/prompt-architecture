document.addEventListener('DOMContentLoaded', () => {
  // Prompt Playground Tabs
  const promptTabs = document.querySelectorAll('.prompt-tab');
  const promptCode = document.getElementById('promptCode');
  const copyBtn = document.getElementById('copyPromptBtn');

  const promptLibrary = {
    cot: `<span class="tag">[SYSTEM]</span> You are an autonomous Senior Principal Strategist.
<span class="tag">[CONTEXT]</span> Multi-market product expansion with zero marginal cost.
<span class="tag">[DIRECTIVE]</span> Formulate a 3-stage validation loop:
  1. Adversarial risk stress-testing
  2. Recursive logic verification
  3. Execution roadmap formatted in JSON Schema.
<span class="tag">[OUTPUT SPEC]</span> Deterministic, zero-hallucination, high entropy.`,

    system: `<span class="tag">[META-ROLE]</span> Constitutional AI Safety & Directive Arbitrator.
<span class="tag">[OBJECTIVE]</span> Filter and sanitize downstream sub-agent communications.
<span class="tag">[CONSTRAINTS]</span>
  - Strict tone invariance: Objective, concise, empirical.
  - Reject ambiguous queries and output structured error codes.
  - Guarantee deterministic parameter passing for API tool calling.`,

    code: `<span class="tag">[AGENT DEFINITION]</span> Autonomous Research Crawl Worker.
<span class="tag">[TOOLS AVAILABLE]</span> [WebSearch, ReadPDF, ExtractData, DispatchWebhook]
<span class="tag">[TASK LOOP]</span>
  WHILE unverified_claims > 0:
    1. Cross-reference source citations (min 3 independent domains)
    2. Score reliability coefficient (0.0 to 1.0)
    3. Self-correct hallucinations before passing payload.`
  };

  promptTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      promptTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabType = tab.getAttribute('data-tab');
      if (promptCode && promptLibrary[tabType]) {
        promptCode.innerHTML = `<code>${promptLibrary[tabType]}</code>`;
      }
    });
  });

  // Copy Prompt
  if (copyBtn && promptCode) {
    copyBtn.addEventListener('click', () => {
      const textToCopy = promptCode.innerText;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const origText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = origText;
        }, 1500);
      });
    });
  }

  // Accordion Logic
  const accCards = document.querySelectorAll('.acc-card');
  accCards.forEach(card => {
    const header = card.querySelector('.acc-header');
    if (!header) return;

    header.addEventListener('click', () => {
      const isActive = card.classList.contains('active');
      accCards.forEach(c => {
        c.classList.remove('active');
        const icon = c.querySelector('.acc-btn');
        if (icon) icon.textContent = '+';
      });

      if (!isActive) {
        card.classList.add('active');
        const icon = card.querySelector('.acc-btn');
        if (icon) icon.textContent = '−';
      }
    });
  });

  // Modal
  const modal = document.getElementById('enrollModal');
  const closeModal = document.getElementById('closeModal');
  const modalPlanName = document.getElementById('modalPlanName');
  const openButtons = document.querySelectorAll('.open-modal-btn');
  const hazraForm = document.getElementById('hazraForm');

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const plan = e.currentTarget.getAttribute('data-plan') || 'Hazra Prompt AI Masterclass';
      if (modalPlanName) {
        modalPlanName.textContent = plan;
      }
      if (modal) {
        modal.classList.add('open');
      }
    });
  });

  if (closeModal && modal) {
    closeModal.addEventListener('click', () => {
      modal.classList.remove('open');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  }

  // Form Submit
  if (hazraForm) {
    hazraForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('hzName').value;
      const payGateway = document.querySelector('input[name="hzPay"]:checked')?.value || 'bKash';
      
      const submitBtn = hazraForm.querySelector('button[type="submit"]');
      const origText = submitBtn.textContent;
      submitBtn.textContent = 'Activating Access...';
      submitBtn.disabled = true;

      setTimeout(() => {
        alert(`Welcome to Hazra Prompt, ${name}! Your registration via ${payGateway} is recorded. You will receive prompt library access keys on WhatsApp shortly.`);
        submitBtn.textContent = origText;
        submitBtn.disabled = false;
        hazraForm.reset();
        modal.classList.remove('open');
      }, 1000);
    });
  }
});
