#!/usr/bin/node

const fs = require('fs');
const util = require('util');

const print_log = true; // TODO: Make configurable
const save_backup = true; // TODO: Make configurable

const ioc_fn = process.argv[2];
const schematic_fn = process.argv[3];

if (process.argv.length < 4 || !fs.existsSync(ioc_fn) || !fs.existsSync(schematic_fn)) {
    console.error(`
Usage:

${process.argv[1]} STM32CubeMX_file.ioc KiCad_schematic_file.kicad_sch
`);

    process.exit(1);
}


const schematic_file = fs.readFileSync(schematic_fn, 'utf-8')
const cube_file = fs.readFileSync(ioc_fn, 'utf-8')

// Stores CubeMX pin configurations
const pin_map = {};

const pin_re = /(^P[A-Z][0-9]+)(-[^.]+)?\.([^=]+)=(.*)$/
const name_re = /Mcu.UserName=(.*)/
const sym_re = /\(symbol "(?:([^:]*):)?([^"]+)"/
const ki_pin_name_re = /(\s*\(name\s+")([^"]*)(".*)/

// Used for matching up to the right KiCad symbol
let mcu_name = ""

cube_file.split(/[\r\n]+/).forEach(function(line) {
    // First find anything that looks like a pin property
    const match = line.match(pin_re);
    if (match) {
        // console.log(`${line} => ${util.inspect(match, {colors: true})}`);

        const name = match[1];

        if (!pin_map[name]) pin_map[name] = {
            base_name: name,
            name_suffix: match[2]
        };

        const pd = pin_map[name];

        pd[match[3]] = match[4]
    } else {
        // If we don't have a pin, check for an MCU name
        const mu = line.match(name_re);
        if (mu) {
            // console.log(`${line} => ${util.inspect(mu, {colors: true})}`);
            mcu_name = mu[1];
        }
    }

});

// STM32 MCU names use 'x' as wildcard
const mcu_re = new RegExp(`^${mcu_name.replace(/x/, '.*')}.*`);

// Create pin names. Spaces are converted to underscore by KiCad. Leaving these spaces for when they finally address that issue.
for (const pn of Object.keys(pin_map)) {
    const pin = pin_map[pn];
    let name;
    if (pin.GPIO_Label) {
        if (pin.Signal) {
            name = `${pin.GPIO_Label} (${pin.Signal} / ${pin.base_name}${pin.name_suffix || ''})`
        } else {
            name = `${pin.GPIO_Label} (${pin.base_name}${pin.name_suffix || ''})`
        }
    } else {
        if (pin.Signal) {
            name = `${pin.Signal} (${pin.base_name}${pin.name_suffix || ''})`;
        } else {
            name = `${pin.base_name}${pin.name_suffix || ''}`;
        }
    }
    pin.user_name = name;
    // console.log(`${pin.base_name} => ${name}`)
}

// The current 'active' symbol
let sym;
// The current active pin
let ap;

const output = [];
const log = [];

schematic_file.split(/[\r\n]+/).forEach(function(line) {
    const sm = line.match(sym_re);
    if (sm) {
        // console.log(util.inspect(sm ))
        sym = sm[2];
    } else if (sym && mcu_re.test(sym)) {
        const m = line.match(ki_pin_name_re);
        if (m) {
            // console.log(util.inspect(m, {colors:true}));

            const m2 = m[2].match(/^(P[A-Z][0-9]+)(-.+)?$/) || m[2].match(/.*[ _(](P[A-Z][0-9]+)(-.+)?\)$/);

            if (m2) {
                // console.log(m2);
    
                const n = m2[1];

                let replacement;
    
                if (pin_map[n]) {
                    replacement = pin_map[n].user_name;
                } else {
                    replacement = `${m2[1]}${m2[2]||''}`;
                }
                if (print_log) {
                    log.push(`${n} => ${replacement}`)
                }
                output.push(`${m[1]}${replacement}${m[3]}`);
                return;
            }

        }
    }

    output.push(line);
});

function write_and_backup(fn, data, mode = 'utf-8') {
    if (save_backup) {
        if (fs.existsSync(fn)) {
            let bfn;
            let i = 0;
            do {
                bfn = `${fn}.${++i}`
            } while (fs.existsSync(bfn));
            fs.renameSync(fn, bfn);
        }
    }
    fs.writeFileSync(fn, data, mode);
}

write_and_backup(schematic_fn, output.join('\n'));

if (print_log) {
    // Prints the list of pin modifications done, nicely sorted
    console.log(log.sort(function(a, b) {
        return a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      } ).join('\n'))
}
