(function($) {
  $(document).ready(function(doc) {
    
    var extent;
    
    // wait for mapsherpa to initialize before we kick off everything
    if (window.mapsherpa) {
      
    // can't use OnDemand yet, please wait ...
    $('.btn-launch-ondemand').button('loading');
    
    /* handle resizing on initialization and window events */
    function resize() {
      var offset = $("#ondemand-customize").offset();
      var pageWidth = $(window).width();
      var fudgeFactor = $('body').hasClass('ondemand-full') || pageWidth <= 767 ? 0 : 21;
      var height = $(window).height() - offset.top - fudgeFactor;
      $("#ondemand-customize").height(height);
      $(".ondemand-sidebar-inner").height(height - $('.ondemand-sidebar-footer').height());
    }
    $(window).resize(resize);
      
      if (mapsherpa.initialized) {
        mapsherpaSetup();
      } else {
        mapsherpa.on('initialized', mapsherpaSetup);
      }
    }
    
    // configure mapsherpa ...
    function mapsherpaSetup() {
      // okay, you can use it now!
      $('.btn-launch-ondemand').button('reset');
      
      // capture the extent so we can use it to preserve the same
      // area on template change
      mapsherpa.on('extent-change', function(event, bounds) {
        var se = bounds.getSouthEast();
        var nw = bounds.getNorthWest();
        extent = [[se.lat,se.lng],[nw.lat,nw.lng]];
      });
      
      // move pod UI into our custom container
      $('#mapsherpa-pod').appendTo('.ondemand-map');
      $('.ms-pod-preview, .ms-pod-customize')
        .removeClass('ms-pod-btn')
        .addClass('btn')
        .insertBefore('.ondemand-menu .add-to-cart');
      $('.ms-pod-preview').html("<i class='icon-eye-open'></i><span class='hidden-phone'> Preview</span>");
      $('.ms-pod-customize').html("<i class='icon-pencil'></i><span class='hidden-phone'> Customize</span>");
	  $('.ondemand-menu').appendTo('.ms-pod-buttons');
      $('body').on('click', '.btn-hide-ondemand', function() {
        $('body').removeClass('ondemand-show');
      });
      
      $('body').on('click', '.btn-launch-ondemand', function() {
        var variant = getVariant(mapping, selectedOptions);
        var data = variant.sku.split('-');
        var productId = data[0];
        var templateId = data[1];
        extent = null;
        
        $('body').addClass('ondemand-show');
        resize();
        customize(productId, templateId, variant.id, 'landscape', extent);
      });
    
      $('body').on('click', '.add-to-cart', function() {
        mapsherpa.fire('click-addtocart');
      });
      
      $('body').on('click', 'a[data-printpdf-id]', function() {
        var id = $(this).attr('data-printpdf-id');
        mapsherpa.preview(id);
      });
      
      $('body').on('click', '.ms-pod-preview').click(function() {
        $('.ondemand-sidebar input[type=radio]').prop('disabled', true);
      });
      
      $('body').on('click', '.ms-pod-customize').click(function() {
        $('.ondemand-sidebar input[type=radio]').prop('disabled', false);
      })

      $('body').on('click', '[name="orientation"]', function(e) {
        mapsherpa.setLayout($(this).val());
      });

    }
    
    function customize(productid, templateid, variantid, layout, extent) {
      mapsherpa.customize(productid, templateid, {layout: layout, extent: extent}, function(err, printpdf) {
        if (err) {
          alert(err.message);
        } else {
          $('body').removeClass('ondemand-show');
          $.ajax('/cart/add.js', {
            type: 'POST',
            data: {
              id: variantid,
              quantity: 1,
              'properties[printpdf]': printpdf.id
            },
            dataType: 'json',
            success: function(line_item) {
              $.ajax('/cart.js', {
                type: 'GET',
                dataType: 'json',
                success: function(cart) {
                $(".cart-item-badge").text('(' + cart.item_count + ' item' + (cart.item_count > 1 ? 's':'') + ')');
                // $('#afterAdd').modal({show:true});
                }
              });
            }
          });
        }
      });
    }
      
    var uniqueOptions;
    var mapping;
    var selectedOptions;
  
    window.mapsherpaProduct = function(product) {
      uniqueOptions = getUniqueOptions(product);
      mapping = generateVariantMapping(product, uniqueOptions);
      selectedOptions = {};
  
      for (var i=0; i<product.options.length; i++) {
        var option = product.options[i];
        var html = format($('#option-header').html(), {option: option});
        for (var j=0; j<uniqueOptions[option].length; j++) {
          html += format($('#option-item').html(), {
            optionName: option.replace(' ', '-'), 
            optionData: 'option' + i, 
            optionId: option.replace(' ', '-') + '-' + j, 
            value: uniqueOptions[option][j],
            safeValue: uniqueOptions[option][j].replace(/\"/g, '&quot;'),
            checked: j==0 ? 'checked':''
          });
        }
        selectedOptions['option'+i] = uniqueOptions[option][0];
        html += $('#option-footer').html();
    
        if (option == 'Size') {
          $('<div class=""></div>').html(html).insertBefore('.orientation-options');
        } else {
          $('<div class=""></div>').html(html).appendTo('.ondemand-options');
        }
    
        $('[name='+option.replace(' ', '-')+']').change(function() {
          selectedOptions[$(this).attr('data-option')] = $(this).val();
          updateOptions(product);
          updatePrice();
          
          var variant = getVariant(mapping, selectedOptions);
          var data = variant.sku.split('-');
          var productId = data[0];
          var templateId = data[1];
          var extent = null;
        
          customize(productId, templateId, variant.id, 'landscape', extent);
        });
      }
      updateOptions(product);
      updatePrice();
    }
  
    function updateOptions(product) {
      var option0 = selectedOptions.option0;
      var options = uniqueOptions[product.options[1]];
    
      for (var i=0, n=options.length; i<n; i++) {
        var el = $('#'+product.options[1]+'-'+i)
        if (getVariant(mapping, {option0: option0, option1: options[i] })) {
          el.prop('disabled', false);
          el.parent().removeClass('disabled');
        } else {
          if (el.checked) {
            // do something about it being checked
          }
          el.prop('disabled', true);
          el.parent().addClass('disabled');
        }
      }
    }
  
    function updatePrice() {
      var variant = getVariant(mapping, selectedOptions);
      if (variant) {
        $('.ondemand-price').html(Shopify.formatMoney(variant.price, "<span class=\"money\"><small class='hidden-phone'>Sub Total: </small>${{amount}}</span>"));
        $('.add-to-cart').attr('disabled', false);
      } else {
        $('.ondemand-price').html('not available');
        $('.add-to-cart').attr('disabled', true);
      }
    }

    function getVariant(mapping, options) {
      for (var i=0;i<mapping.length; i++) {
        var match = true;
        for (var j=0;j<3 && match; j++) {
          if (typeof options['option'+j] !== 'undefined') {
            if (mapping[i]['option'+j] != options['option'+j]) {
              match = false;
            }
          }
        }
        if (match) {
          return mapping[i].variant;
        }
      }
      return null;
    }

    function generateVariantMapping(product) {
      var mapping = [];
  
      for (var i=0, n=product.variants.length; i<n; i++) {
        mapping.push(getVariantMap(product.variants[i]));
      }
  
      return mapping;
    }

    function getVariantMap(variant) {
      var n = variant.options.length;
      var mapping = {
        option0: n>0?variant.options[0]:'',
        option1: n>1?variant.options[1]:'',
        option2: n>2?variant.options[2]:'',
        variant: variant
      };
  
      return mapping;
    }

    function getUniqueOptions(product) {
      var options = {};
      var i, j, n;
      for (i=0, n=product.options.length; i<n; i++) {
        var option = product.options[i];
        options[option] = [];
        for (j=0, n=product.variants.length; j<n; j++) {
          var variant = product.variants[j]['option'+(i+1)];
          if (options[option].indexOf(variant) == -1) {
            options[option].push(variant);
          }
        }
      }
      return options;
    }

    function format(tmpl, args) {
      return tmpl.replace(/\$\{(.*?)\}/g, function(match, item) {
        return args[item] ? args[item] : match;
      });
    }    
  });
})(window.jQuery);