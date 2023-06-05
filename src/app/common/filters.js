(function (angular) { 'use strict';

angular.module('termed.filters', ['pascalprecht.translate'])

.filter('capitalize', function() {
  return function(input) {
    return input.charAt(0).toUpperCase() + input.slice(1);
  };
})

.filter('limit', function() {
  return function(input, max) {
    return input.length > max ? input.substring(0, max) + "..." : input;
  };
})

.filter('localizeValue', function($translate) {
  return function(propertyValues, defaultValue) {
    if (!propertyValues || propertyValues.length === 0) {
      return defaultValue || '-';
    }

    const lang = $translate.use();

    for (let i = 0; i < propertyValues.length; i++) {
      if (propertyValues[i].lang === lang && propertyValues[i].value.length > 0) {
        return propertyValues[i].value;
      }
    }

    if (propertyValues[0].value.length > 0) {
      const langInfo = propertyValues[0].lang ? " (" + propertyValues[0].lang + ")" : "";
      return propertyValues[0].value + langInfo;
    }

    return defaultValue || '-';
  };
})

.filter('localizeAnyValue', function($translate) {
  return function(properties, preferredProperty, defaultValue) {
    if (!properties || Object.keys(properties).length === 0) {
      return defaultValue || '-';
    }

    const currentLang = $translate.use();

    const preferredValues = properties[preferredProperty];

    if (preferredValues && preferredValues.length > 0) {
      for (let i = 0; i < preferredValues.length; i++) {
        if (preferredValues[i].lang === currentLang && preferredValues[i].value.length > 0) {
          return preferredValues[i].value;
        }
      }
      if (preferredValues[0].value.length > 0) {
        const langInfo = preferredValues[0].lang ? " (" + preferredValues[0].lang + ")" : "";
        return preferredValues[0].value + langInfo;
      }
    }

    const results = [];

    for (const property in properties) {
      const values = properties[property];

      for (let j = 0; j < values.length; j++) {
        const lang = values[j].lang;
        const value = values[j].value.substring(0, 60);

        if ((lang === currentLang || lang === '') && value.length > 0) {
          results.push(property + ": " + value);
        } else {
          results.push(property + ": " + value + " (" + lang + ")");
        }
      }
    }

    return results.length > 0 ? results.join(", ").substring(0, 200) : (defaultValue || '-');
  };
});

})(window.angular);
