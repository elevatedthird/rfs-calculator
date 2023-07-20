const defaultOptions = {
  baseValue: 20, //px
  unit: 'rem',
  breakpoint: 1200,
  breakpointUnit: 'px',
  factor: 10,
  twoDimensional: false,
  unitPrecision: 5,
  remValue: 16,
  functionName: 'rfs',
  enableRfs: true,
  mode: 'min-media-query'
};

// Based off of rfs v9.x
class ResponsiveFontSize {
  constructor(opts) {
    this.opts = { ...defaultOptions, ...opts };

    if (typeof this.opts.baseValue !== 'number') {
      if (this.opts.baseValue.endsWith('px')) {
        this.opts.baseValue = Number.parseFloat(this.opts.baseValue);
      } else if (this.opts.baseValue.endsWith('rem')) {
        this.opts.baseValue = Number.parseFloat(this.opts.baseValue) * this.opts.remValue;
      } else {
        throw new TypeError('`baseValue` option is invalid, it should be set in `px` or `rem`.');
      }
    }

    if (typeof this.opts.breakpoint !== 'number') {
      if (this.opts.breakpoint.endsWith('px')) {
        this.opts.breakpoint = Number.parseFloat(this.opts.breakpoint);
      } else if (this.opts.breakpoint.endsWith('em')) {
        this.opts.breakpoint = Number.parseFloat(this.opts.breakpoint) * this.opts.remValue;
      } else {
        throw new TypeError('`breakpoint` option is invalid, it should be set in `px`, `rem` or `em`.');
      }
    }

    if (!['px', 'rem', 'em'].includes(this.opts.breakpointUnit)) {
      throw new TypeError('`breakpointUnit` option is invalid, it should be `px`, `rem` or `em`.');
    }
  }

  toFixed(number, precision) {
    const multiplier = 10 ** (precision + 1);
    const wholeNumber = Math.floor(number * multiplier);

    return Math.round(wholeNumber / 10) * 10 / multiplier;
  }

  renderValue(value) {
    // Do not add unit if value is 0
    if (value === 0) {
      return value;
    }

    // Render value in desired unit
    return this.opts.unit === 'rem' ?
      `${this.toFixed(value / this.opts.remValue, this.opts.unitPrecision)}rem` :
      `${this.toFixed(value, this.opts.unitPrecision)}px`;
  }
  // @param declarationValue {string}
  process(declarationValue, fluid) {
    let value = Number.parseFloat(declarationValue);

    // Convert to px if in rem
    if (this.opts.unit === 'rem') {
      value *= this.opts.remValue;
    }

    // Only add responsive function if needed
    if (!fluid || this.opts.baseValue >= Math.abs(value) || this.opts.factor <= 1 || !this.opts.enableRfs) {
      return this.renderValue(value);
    }

    // Calculate base and difference
    let baseValue = this.opts.baseValue + ((Math.abs(value) - this.opts.baseValue) / this.opts.factor);
    const diff = Math.abs(value) - baseValue;

    // Divide by remValue if needed
    if (this.opts.unit === 'rem') {
      baseValue /= this.opts.remValue;
    }

    const viewportUnit = this.opts.twoDimensional ? 'vmin' : 'vw';

    return value > 0 ? {
        [this.opts.unit]: this.toFixed(baseValue, this.opts.unitPrecision),
        [viewportUnit]: this.toFixed(diff * 100 / this.opts.breakpoint, this.opts.unitPrecision),
        operator: '+',
      } : 
      {
        [this.opts.unit]: this.toFixed(baseValue, this.opts.unitPrecision) * -1,
        [viewportUnit]: this.toFixed(diff * 100 / this.opts.breakpoint, this.opts.unitPrecision),
        operator: '-',
      };
  }

  // Return the value without `rfs()` function
  // eg. `4px rfs(32px)` => `.25rem 2rem`
  value(value) {
    return this.process(value, false);
  }

  // Convert `rfs()` function to fluid css
  // eg. `4px rfs(32px)` => `.25rem calc(1.325rem + 0.9vw)`
  fluidValue(value) {
    return this.process(value, true);
  }


  getOptions() {
    return this.opts;
  }

  getPixelValueAtScreenWidth(processResult, width) {
    if (typeof processResult !== 'object') {
      return Number.parseFloat(this.value(processResult));
    }
    const screenWidth = parseInt(width, 10);
    let unitVal = Number.parseFloat(this.value(processResult[this.opts.unit]));
    if (this.opts.unit === 'rem') {
      // Convert back to pixels.
      unitVal *= this.opts.remValue;
    }
    if (processResult.operator === '+') {
      return (unitVal) + ((processResult.vw * screenWidth) / 100);
    }
    if (processResult.operator === '-') {
      return (unitVal) - ((processResult.vw * screenWidth) / 100);
    }
  }
};

const rfs = new ResponsiveFontSize();
const form = document.getElementById('form');
const unit = document.getElementById('fs-unit');
const result = document.getElementById('result');

document.querySelectorAll('input[name=unit]').forEach((el) => {
  el.addEventListener('change', (e) => {
    unit.innerText = e.target.value;
  })
})

form.addEventListener('submit', (e) => {
 e.preventDefault();
 result.innerText = '';
 const formData = new FormData(e.target);
 const screenWidth = formData.get('screen-width');
 if (screenWidth.length === 0) {
  result.innerText = 'Please add a screen width';
  return;
 }
 // Set any config changes.
 const config = ['breakpoint', 'factor', 'unit'];
 config.forEach((name) => {
  const val = !Number.isNaN(parseInt(formData.get(name), 10)) ? parseInt(formData.get(name), 10) : formData.get(name);
  rfs.opts[name] = val;
 });

 const inputNames = ['h1-size', 'h2-size', 'h3-size', 'h4-size', 'h5-size', 'h6-size', 'body-size' ];
 inputNames.forEach((name) => {
  // Calculate all the font sizes at a given screen width.
  if (formData.get(name).length > 0) {
    const size = rfs.getPixelValueAtScreenWidth(rfs.fluidValue(formData.get(name) + 'rem'), screenWidth);
    result.innerText += `${name.split('-')[0].toUpperCase()} : ${Math.ceil(size)}px \n`;
   }
 });
})
