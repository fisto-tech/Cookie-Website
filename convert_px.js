const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'style.css');
let content = fs.readFileSync(filepath, 'utf8');

// Regex to match css properties and their values
const propertyRegex = /([a-zA-Z-]+)\s*:\s*([^;\}]+)/g;

content = content.replace(propertyRegex, (match, prop, values) => {
    const propLower = prop.toLowerCase();
    const isVertical = ['height', 'top', 'bottom'].some(x => propLower.includes(x)) && !propLower.includes('width');
    
    const newValues = values.replace(/([\d\.]+)px/g, (m, numStr) => {
        const val = parseFloat(numStr);
        if (isNaN(val)) return m;
        if (val <= 3 && val > 0) return m; // preserve small borders
        if (val === 0) return '0';
        
        let newVal;
        if (isVertical) {
            newVal = (val / 1080) * 100;
            newVal = Math.round(newVal * 1000) / 1000; // round to 3 decimal places
            return `${newVal}vh`;
        } else {
            newVal = (val / 1920) * 100;
            newVal = Math.round(newVal * 1000) / 1000; // round to 3 decimal places
            return `${newVal}vw`;
        }
    });
    
    return `${prop}:${newValues}`;
});

fs.writeFileSync(filepath, content, 'utf8');
console.log("Conversion complete.");
