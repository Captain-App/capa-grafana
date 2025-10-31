// ==UserScript==
// @name         Hide Grafana Dashboard Controls
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hide the top controls bar on Grafana dashboards
// @author       You
// @match        https://capa.grafana.net/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    // Function to hide Grafana controls
    function hideControls() {
        // Hide the top navigation bar
        const selectors = [
            '[class*="navbar"]',
            '[class*="topnav"]',
            '[data-testid="topnav"]',
            '.navbar',
            '.page-toolbar',
            '[aria-label="Top navigation"]',
            'header',
            '.grafana-app',
            '[class*="MegaMenu"]',
            '[class*="pageToolbar"]'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.offsetHeight > 0 && el.offsetHeight < 100) {
                    // Likely the top bar - hide it
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.style.height = '0';
                    el.style.overflow = 'hidden';
                }
            });
        });
        
        // Hide specific Grafana control elements
        const controlSelectors = [
            '[class*="timepicker"]',
            '[class*="refresh-picker"]',
            '[aria-label*="Refresh"]',
            '[aria-label*="Time range"]',
            'button[aria-label*="Refresh"]',
            '.timepicker'
        ];
        
        controlSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
            });
        });
        
        // Adjust main content to fill screen
        const mainContent = document.querySelector('[class*="main-view"]') || 
                           document.querySelector('.dashboard-container') ||
                           document.querySelector('[class*="dashboard"]') ||
                           document.body;
        
        if (mainContent) {
            mainContent.style.marginTop = '0';
            mainContent.style.paddingTop = '0';
        }
        
        // Hide any remaining top bars
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top === 0 && rect.height < 80 && rect.height > 30) {
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'sticky') {
                    el.style.display = 'none';
                }
            }
        });
    }
    
    // Run immediately
    hideControls();
    
    // Run after a delay (Grafana loads dynamically)
    setTimeout(hideCB, 1000);
    setTimeout(hideControls, 2000);
    setTimeout(hideControls, 5000);
    
    // Watch for DOM changes (Grafana uses React/Dynamic loading)
    const observer = new MutationObserver(() => {
        hideControls();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('Grafana controls hiding script loaded');
})();

