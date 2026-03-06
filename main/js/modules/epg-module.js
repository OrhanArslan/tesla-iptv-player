/**
 * EPG Module
 * Handles Electronic Program Guide functionality
 */

class EPGModule {
  constructor() {
    this.epgData = new Map();
    this.currentHour = new Date().getHours();
  }

  /**
   * Initialize EPG module
   */
  init() {
    // EPG will be loaded on demand when user clicks EPG view
  }

  /**
   * Render EPG
   */
  async render() {
    try {
      const container = document.getElementById('epg-programs');
      if (!container) return;

      container.innerHTML = '<div style="text-align:center;padding:20px;">Loading EPG...</div>';

      // Load EPG data for first few channels
      const channels = contentModule.content.live.slice(0, 20);
      const epgEntries = [];

      for (const channel of channels) {
        const epg = await apiService.getEPG(channel.stream_id, 5);
        epgEntries.push({
          channel,
          programs: epg,
        });
      }

      this.renderEPGData(epgEntries);
    } catch (error) {
      console.error('EPG render error:', error);
      document.getElementById('epg-programs').innerHTML = '<p style="color:red;">Failed to load EPG1</p>';
    }
  }

  /**
   * Render EPG data
   */
  renderEPGData(entries) {
    const container = document.getElementById('epg-programs');
    if (!container) return;

    container.innerHTML = '';

    if (entries.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No EPG data available</p>';
      return;
    }

    entries.forEach(entry => {
      const block = this.createEPGBlock(entry.channel, entry.programs);
      container.appendChild(block);
    });
  }

  /**
   * Create EPG block for a channel
   */
  createEPGBlock(channel, programs) {
    const block = document.createElement('div');
    block.className = 'epg-channel-block';

    const name = document.createElement('div');
    name.className = 'epg-channel-name';
    name.textContent = channel.name;
    block.appendChild(name);

    const timeline = document.createElement('div');
    timeline.className = 'epg-programs-timeline';

    if (!programs || programs.length === 0) {
      const noData = document.createElement('div');
      noData.className = 'epg-program';
      noData.textContent = 'No EPG data';
      timeline.appendChild(noData);
    } else {
      programs.forEach(program => {
        const programEl = this.createProgramElement(program);
        timeline.appendChild(programEl);
      });
    }

    block.appendChild(timeline);
    return block;
  }

  /**
   * Create program element
   */
  createProgramElement(program) {
    const el = document.createElement('div');
    el.className = 'epg-program';

    const now = new Date();
    const startTime = new Date(program.start * 1000);
    const endTime = new Date(program.end * 1000);

    // Check if program is currently live
    if (startTime <= now && now <= endTime) {
      el.classList.add('live');
      el.innerHTML = '<div class="epg-program-badge">LIVE</div>';
    }

    const time = document.createElement('div');
    time.className = 'epg-program-time';
    time.textContent = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
    el.appendChild(time);

    const title = document.createElement('div');
    title.className = 'epg-program-title';
    title.textContent = program.title || 'Unknown Program';
    el.appendChild(title);

    el.addEventListener('click', () => {
      console.log('Selected program:', program);
    });

    return el;
  }
}
