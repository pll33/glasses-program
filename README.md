# Glasses Inventory Program

This program is used to search for eyeglasses that match closely (within an acceptable range) to a given patient's eye prescriptions obtained by an autorefractor.

The application has been used by [Global Medical Brigades](https://www.globalbrigades.org/experience-medical-brigades) staff and volunteers in Panama (since April 2016), Honduras (since May 2016) and Nicaragua (since May 2016). It has also been used by [Surgicorps International](http://surgicorps.org/) staff on medical mission trips in Vietnam (since October 2016). 

## Instructions

### Set Up

1. Download and unzip a `GLASSES-PROGRAM.ZIP` from the code repository release page: https://github.com/pll33/glasses-program/releases
3. Open 'index.html' with web browser of your choice (recommended: Google Chrome)
4. Locate and click on the 'Import' tab
5. Add glasses data by either clicking the 'Choose File' button under Upload, or add them manually. A sample dataset (exampleSet.csv) is provided in the data directory.
6. Click the Import or Add button to add them to the program inventory. These will now be visible in the Inventory tab.

### Searching the inventory

1. Go to the 'Glasses Search' tab
2. Input the patient's dominant eye (right, left, or none) and their refraction numbers. Spherical equivalent values are automatically generated
3. Click the 'Find Matches' button to search the inventory. Your search is automatically saved into the Previous Searches table at the bottom of the panel

### Selecting the best pair

1. The best matches will be highlighted in green. This means a particular value you entered is an exact match to the same value in a particular pair of glasses
2. If no pairs of eyeglasses appear:
     1. Take the right eye and left eye values listed in the "Spherical Equivalent" fields, and type them in as the spheres for the "Patient's Refraction" with 0.00 for both cylinders, and 0 for both axis values. Run the search again by clicking 'Find Matches'
     2. If still no eyeglasses appear, then there are no remaining pairs of eyeglasses in your set that fit for the patient.

### Exporting

1. Navigate to the 'Export' tab
2. Export program data via .CSV or .JSON options.

Program data is automatically saved within the application's local PouchDB database during use and the program can be exited safely at any time without loss of data.

## To Do

### Enhancements

- [ ] Log easily understandable info/errors to the 'Log' tab and to a file
- [ ] Add unique identifier on initial program load
- [ ] Async functions for inventory
- [x] Translations (Spanish), i18n/l10n
- [ ] Replace AngularJS (v1) with newer framework (React, Angular 4, etc)

### Maintenance/Build Tools
- [x] Remove Chrome app references ([support for non-Chrome OS apps removed by 2018](https://blog.chromium.org/2016/08/from-chrome-apps-to-web.html))
- [x] Update to ES6 code with Babel/Webpack
- [ ] Update dependency versions to latest non-breaking ([papaparse](https://github.com/mholt/PapaParse), [pouchdb](https://github.com/pouchdb/pouchdb), [pouchdb-find](https://github.com/nolanlawson/pouchdb-find))
- [ ] Cleanup, refactor, and modularize code
  - [x] Add ESLint
- [ ] Add unit tests
