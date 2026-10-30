document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  
  const loadingContainer = document.getElementById('loadingContainer');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  
  const errorContainer = document.getElementById('errorContainer');
  const errorMessage = document.getElementById('errorMessage');
  const errorRetryBtn = document.getElementById('errorRetryBtn');
  
  const resultsSection = document.getElementById('resultsSection');
  const sourcesGrid = document.getElementById('sourcesGrid');
  const sourceCountLabel = document.getElementById('sourceCount');
  const answerText = document.getElementById('answerText');
  const queryBadge = document.getElementById('queryBadge');

  let activeLoadingTimers = [];

  // Submit Handler
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    performSearch(query);
  });

  // Retry Handler
  errorRetryBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      performSearch(query);
    }
  });

  async function performSearch(query) {
    // 1. Reset UI States
    errorContainer.classList.add('hidden');
    resultsSection.classList.add('hidden');
    loadingContainer.classList.remove('hidden');
    appContainer.classList.add('results-active');
    
    // Disable inputs
    searchInput.disabled = true;
    searchButton.disabled = true;

    // Start loading step simulation
    startLoadingSimulation();

    try {
      // 2. Fetch results from backend
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete search query.');
      }

      const data = await response.json();

      // 3. Complete loading steps
      completeLoadingSimulation();

      // 4. Render Results
      renderResults(data);

    } catch (error) {
      console.error(error);
      completeLoadingSimulation();
      
      // Show Error Container
      loadingContainer.classList.add('hidden');
      errorContainer.classList.remove('hidden');
      errorMessage.textContent = error.message || 'An unexpected error occurred. Please try again.';
      
      // Keep input at top so user can edit query
      appContainer.classList.add('results-active');
    } finally {
      // Re-enable inputs
      searchInput.disabled = false;
      searchButton.disabled = false;
    }
  }

  // Simulations for step status updates to make the UX feel premium and reactive
  function startLoadingSimulation() {
    // Reset steps
    resetSteps();
    activeLoadingTimers = [];

    // Step 1 active immediately
    setStepActive(step1);

    // Simulate Step 2 starting after 1.5s
    const t1 = setTimeout(() => {
      setStepDone(step1);
      setStepActive(step2);
    }, 1500);

    // Simulate Step 3 starting after 3s
    const t2 = setTimeout(() => {
      setStepDone(step2);
      setStepActive(step3);
    }, 3200);

    activeLoadingTimers.push(t1, t2);
  }

  function completeLoadingSimulation() {
    activeLoadingTimers.forEach(t => clearTimeout(t));
    setStepDone(step1);
    setStepDone(step2);
    setStepDone(step3);
  }

  function resetSteps() {
    [step1, step2, step3].forEach(step => {
      step.className = 'step';
    });
  }

  function setStepActive(stepElement) {
    stepElement.classList.remove('done');
    stepElement.classList.add('active');
  }

  function setStepDone(stepElement) {
    stepElement.classList.remove('active');
    stepElement.classList.add('done');
  }

  // Render search findings
  function renderResults(data) {
    // Hide Loading
    loadingContainer.classList.add('hidden');
    
    // Set query badge
    queryBadge.textContent = `"${data.originalQuery}"`;
    queryBadge.title = data.originalQuery;

    // Populate Sources Panel
    sourcesGrid.innerHTML = '';
    const results = data.results || [];
    sourceCountLabel.textContent = `${results.length} found`;

    results.forEach(source => {
      const card = document.createElement('a');
      card.className = 'source-card';
      // Only link http(s) sources, never javascript: or data: URLs
      card.href = /^https?:\/\//i.test(source.url) ? source.url : '#';
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.id = `source-${source.index}`;
      
      // Clean host name for display
      let domain = '';
      try {
        domain = new URL(source.url).hostname.replace('www.', '');
      } catch (e) {
        domain = source.url;
      }

      card.innerHTML = `
        <div class="source-index">${source.index}</div>
        <div class="source-title">${escapeHTML(source.title || 'Untitled Source')}</div>
        <div class="source-snippet">${escapeHTML(source.content || '')}</div>
        <div class="source-url">${escapeHTML(domain)}</div>
      `;
      sourcesGrid.appendChild(card);
    });

    // Parse and render the synthesized answer (Markdown + custom citations replacement)
    const rawAnswer = data.answer || 'No answer generated.';
    
    // Marked configuration
    marked.setOptions({
      gfm: true,
      breaks: true
    });

    let htmlAnswer = marked.parse(rawAnswer);

    // Convert [1], [2], [Source 1], etc., into clickable citation elements
    // This matches patterns like [1], [2] or [Source 1], etc.
    htmlAnswer = htmlAnswer.replace(/\[(?:Source\s+)?(\d+)\]/g, (match, index) => {
      return `<a class="citation" data-index="${index}">${index}</a>`;
    });

    answerText.innerHTML = DOMPurify.sanitize(htmlAnswer);

    // Show Results Section
    resultsSection.classList.remove('hidden');

    // Add interactivity for citation clicks
    setupCitationInteractivity();
  }

  function setupCitationInteractivity() {
    const citations = document.querySelectorAll('.citation');
    
    citations.forEach(cit => {
      cit.addEventListener('click', (e) => {
        e.preventDefault();
        const index = cit.getAttribute('data-index');
        const targetCard = document.getElementById(`source-${index}`);
        
        if (targetCard) {
          // Scroll to card
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          
          // Flash highlight class
          targetCard.classList.add('highlighted');
          
          // Clear highlight after 2.5s
          setTimeout(() => {
            targetCard.classList.remove('highlighted');
          }, 2500);
        }
      });
    });
  }

  // Simple HTML Escaping utility
  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
