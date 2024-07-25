# Export STM32 CubeMX pin assignments to matching symbols in a KiCad schematic

This tool reads a CubeMX `.ioc` file, constructs pin labels and applies those to matching MCU symbols in the given KiCad schematic file.

## Usage

```shell
./cubemx2kicad.js STM32CubeMX_file.ioc KiCad_schematic_file.kicad_sch
```

## Installation

Just clone the repo, beyond Node.JS no dependencies.

## Some points of attention

- CubeMX can stay open during this, but the KiCad schematic editor should be closed and re-opened after
- Use 'user label' in CubeMX for best experience
- The backup and log functions need to be disbled in the source
- This messes up / does not work with alternate pin functions in KiCad, beware.
- The KiCad ERC will complain that the MCU symbol will no longer match the library.
- The KiCad 'parser' is extremely simplistic and doesn't respect the s-expression scoping. It works for what KiCad saves, but is probably fragile when using other exporters.

## Repository & License

Written by Stefan Hamminga <stefan@rbts.co>.

This tool can be downloaded from

https://github.com/rbtsco/cubemx2kicad

and freely distributed under the terms of the Apache 2.0 license.