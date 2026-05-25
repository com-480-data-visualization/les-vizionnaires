/**
 * Correlation Analysis Shared Utilities
 * D3.js visualization helpers and formatters
 */

var CorrelationViz = {
  colors: {
    positive: '#06a77d',
    negative: '#d73027',
    neutral: '#1f77b4'
  },

  formatNumber: function(num) {
    if (num === null || num === undefined) return 'N/A';
    if (num > 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toFixed(0);
  },

  formatCurrency: function(num) {
    if (num === null || num === undefined) return 'N/A';
    return 'CHF ' + num.toFixed(0);
  },

  formatTime: function(minutes) {
    if (minutes === null || minutes === undefined) return 'N/A';
    if (minutes < 60) return minutes.toFixed(0) + ' min';
    var hours = (minutes / 60).toFixed(1);
    return hours + ' h';
  }
};

