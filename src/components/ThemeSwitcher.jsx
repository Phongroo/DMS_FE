const seasonLabels = {
  spring: '💼 Slate Dark',
  summer: '☀️ Pure Light',
  autumn: '🌌 Cyber Indigo',
  winter: '🌿 Emerald'
};

/**
 * Seasonal theme selector widget. Provides visual buttons mapped to Spring, Summer, Autumn, and Winter themes.
 * 
 * @component
 * @param {Object} props - Component properties.
 * @param {string} props.theme - The identifier of currently active theme (e.g., 'spring', 'summer').
 * @param {function(string): void} props.setTheme - Hook dispatcher or function used to change state in parent App shell.
 * @param {string[]} props.seasons - List of available seasonal keys matching styles.
 * @returns {React.ReactElement} Theme selection buttons container.
 */
function ThemeSwitcher({ theme, setTheme, seasons }) {
  return (
    <div className="theme-switcher">
      {seasons.map((season) => (
        <button
          key={season}
          type="button"
          className={theme === season ? 'season-btn active' : 'season-btn'}
          onClick={() => setTheme(season)}
        >
          {seasonLabels[season] || season}
        </button>
      ))}
    </div>
  );
}

export default ThemeSwitcher;
