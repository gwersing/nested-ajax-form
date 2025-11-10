class NestedAjaxForm {
  constructor(options = {}) {
    const defaults = {
      container: null,          // required
      submitTrigger: null,      // optional button selector
      ajaxUrl: null,            // optional AJAX endpoint
      ajaxMethod: 'POST',       // default method
      onSuccess: null,          // AJAX success callback
      onError: null             // AJAX error callback
    };

    this.settings = $.extend({}, defaults, options);

    if (!this.settings.container) {
      throw new Error('Missing required option: container');
    }

    this.$container = $(this.settings.container);
    if (this.$container.length === 0) {
      throw new Error(`Container not found for selector: ${this.settings.container}`);
    }

    if (this.settings.submitTrigger) {
      this.bindSubmitTrigger();
    }
  }

  // Validate that item is a direct child within this scope
  _isImmediateChild($scope, $item) {
      let immediateChildItem = true;
      if ($scope.data("form-role") === "list-item")
      {
        immediateChildItem = $item.closest('[data-form-role="list-item"]').is($scope);
      }
      else
      {
        immediateChildItem = $item.parents('[data-form-role="list"]').length === 0;
      }

      return immediateChildItem;
  }

  /**
   * Recursive helper: Extract input data + nested lists within a given scope
   * @param {jQuery} $scope - container to search for inputs and lists
   * @returns {object} key-value pairs of input data
   */
  _extractInputData($scope) {
    const data = {};
    const self = this;

    // Regular inputs in this scope
    $scope.find(':input[name][data-form-role="input"]').each(function () {
      const $input = $(this);

      if (!self._isImmediateChild($scope, $input)) return;


      const name = $input.attr('name');
      let value;

      if ($input.is(':checkbox')) {
        value = $input.is(':checked');
      } else if ($input.is(':radio')) {
        if (!$input.is(':checked')) return;
        value = $input.val();
      } else if ($input.is('select')) {
        value = $input.prop('multiple') ? ($input.val() || []) : $input.val();
      } else {
        value = $input.val();
      }

      data[name] = value;
    });

    // Handle nested lists within this scope
    $scope.find('[data-form-role="list"]').each((_, listEl) => {
      const $listContainer = $(listEl);

      // Skip if this list is inside another list
      if (!self._isImmediateChild($scope, $listContainer)) return;

      const listName = $listContainer.data('form-list-name');
      if (!listName) return;

      const listItems = [];

      $listContainer.find('[data-form-role="list-item"]').each((_, itemEl) => {
        const $item = $(itemEl);
        // Skip if this list-item is inside a nested list (other than this list container)
        if (!$item.closest('[data-form-role="list"]').is($listContainer)) return;

        const itemModel = this._extractInputData($item);
        listItems.push(itemModel);
      });

      data[listName] = listItems;
    });

    return data;
  }



  // Extract full form data
  getModel() {
    // Top-level scope; exclude nested list-item inputs
    return this._extractInputData(this.$container);
  }

  // Attach click handler to submit trigger
  bindSubmitTrigger() {
    const $trigger = $(this.settings.submitTrigger);
    if ($trigger.length === 0) {
      console.warn(`Submit trigger not found: ${this.settings.submitTrigger}`);
      return;
    }

    $trigger.off('click').on('click', (e) => {
      e.preventDefault();
      this.submitForm();
    });
  }

  // Perform AJAX form submission
  submitForm() {
    const data = this.getModel();

    if (!this.settings.ajaxUrl) {
      console.warn('AJAX URL not provided.');
      return;
    }

    $.ajax({
      url: this.settings.ajaxUrl,
      method: this.settings.ajaxMethod,
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: (response) => {
        if ($.isFunction(this.settings.onSuccess)) {
          this.settings.onSuccess(response);
        } else {
          console.log('AJAX success:', response);
        }
      },
      error: (xhr, status, error) => {
        if ($.isFunction(this.settings.onError)) {
          this.settings.onError(xhr, status, error);
        } else {
          console.error('AJAX error:', status, error);
        }
      }
    });
  }
}
