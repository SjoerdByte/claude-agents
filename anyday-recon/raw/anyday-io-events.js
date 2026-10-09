var language = 'en';
var url = new URL(window.location.href);
var catIdParam = url.searchParams.get("cat-id");
var dealCatIdParam = url.searchParams.get("deal-id");
var config = {};
var allDealCategories = [
  '7a418f22-85f1-4f6c-997e-7390dccf3229',
  '9849bf3f-63d9-4305-8610-c1d87f258f5d',
  'b722cea6-8fea-4870-a1e4-57b8a44e807d',
  '8240993c-6dfc-42f0-98ba-dd0c4830990f',
  '069c7108-fa76-48b0-aca3-61b751f2324e',
  '2a9a6112-65b1-4d5f-a3f2-aec68b9075f4',
  '66b92fdb-d6cf-4628-be21-7e0ef9479206',
  'c71b7386-a61f-4388-aa13-7ea018599e2d',
  '3cd1f971-b82d-4812-a8e9-f213e9a1bdf8'
];
var discountCategories = {
  'all': {
    'caption-en': 'All</br>deals',
    catId: '',
    'heading-en': `<h2 class="n-h2">All deals</h2>`,
    'caption-da': 'All</br>deals',
    'heading-da': `<h2 class="n-h2">All deals</h2>`
  },
  '25t050offall': {
    'caption-en': 'Save from<span class="pink-text">20%</span></br>to<span class="pink-text">50%</span>on all',
    catId: '7a418f22-85f1-4f6c-997e-7390dccf3229',
    'heading-en': `<h2 id="shops" class="n-h2">Save from</h2>
      <h2 id="shops" class="n-h2 pink-text">25%</h2>
      <h2 id="shops" class="n-h2">to</h2>
      <h2 id="shops" class="n-h2 pink-text">50%</h2>
      <h2 id="shops" class="n-h2">on all</h2>`,
    'caption-da': 'Spar<span class="pink-text">20%</span>til<span class="pink-text">50%</span></br>på alle produkter',
    'heading-da': `<h2 id="shops" class="n-h2">Spar</h2>
      <h2 id="shops" class="n-h2 pink-text">25%</h2>
      <h2 id="shops" class="n-h2">til</h2>
      <h2 id="shops" class="n-h2 pink-text">50%</h2>
      <h2 id="shops" class="n-h2">på alle produkter</h2>`
  },
  '25offall': {
    'caption-en': 'Save up to</br><span class="pink-text">25%</span>on all',
    catId: '9849bf3f-63d9-4305-8610-c1d87f258f5d',
    'heading-en': `<h2 id="shops" class="n-h2">Save from</h2>
      <h2 id="shops" class="n-h2 pink-text">25%</h2>
      <h2 id="shops" class="n-h2">on all</h2>`,
    'caption-da': 'Spar op ti<span class="pink-text">25%</span></br>på alle produkter',
    'heading-da': `<h2 id="shops" class="n-h2">Spar op ti</h2>
      <h2 id="shops" class="n-h2 pink-text">25%</h2>
      <h2 id="shops" class="n-h2">på alle produkter</h2>`
  },
  upto80: {
    'caption-en': 'Save up to</br><span class="pink-text">80%</span>',
    catId: 'b722cea6-8fea-4870-a1e4-57b8a44e807d',
    'heading-en': `<h2 id="shops" class="n-h2">Save up to</h2>
      <h2 id="shops" class="n-h2 pink-text">80%</h2>`,
    'caption-da': 'Spar op til</br><span class="pink-text">80%</span>',
    'heading-da': `<h2 id="shops" class="n-h2">Spar op til</h2>
      <h2 id="shops" class="n-h2 pink-text">80%</h2>`
  },
  upto70: {
    'caption-en': 'Save up to</br><span class="pink-text">70%</span>',
    catId: '8240993c-6dfc-42f0-98ba-dd0c4830990f',
    'heading-en': `<h2 id="shops" class="n-h2">Save up to</h2>
      <h2 id="shops" class="n-h2 pink-text">70%</h2>`,
    'caption-da': 'Spar op til</br><span class="pink-text">70%</span>',
    'heading-da': `<h2 id="shops" class="n-h2">Spar op til</h2>
      <h2 id="shops" class="n-h2 pink-text">70%</h2>`
    },
  upto60: {
    'caption-en': 'Save up to</br><span class="pink-text">60%</span>',
    catId: '069c7108-fa76-48b0-aca3-61b751f2324e',
    'heading-en': `<h2 id="shops" class="n-h2">Save up to</h2>
      <h2 id="shops" class="n-h2 pink-text">60%</h2>`,
    'caption-da': 'Spar op til</br><span class="pink-text">60%</span>',
    'heading-da': `<h2 id="shops" class="n-h2">Spar op til</h2>
      <h2 id="shops" class="n-h2 pink-text">60%</h2>`
  },
  upto50: {
    'caption-en': 'Save up to</br><span class="pink-text">50%</span>',
    catId: '2a9a6112-65b1-4d5f-a3f2-aec68b9075f4',
    'heading-en': `<h2 id="shops" class="n-h2">Save up to</h2>
      <h2 id="shops" class="n-h2 pink-text">50%</h2>`,
    'caption-da': 'Spar op til</br><span class="pink-text">50%</span>',
    'heading-da': `<h2 id="shops" class="n-h2">Spar op til</h2>
      <h2 id="shops" class="n-h2 pink-text">50%</h2>`
    },
upto40: {
  'caption-en': 'Save up to</br><span class="pink-text">40%</span>',
  catId: '66b92fdb-d6cf-4628-be21-7e0ef9479206',
  'heading-en': `<h2 id="shops" class="n-h2">Save up to</h2>
    <h2 id="shops" class="n-h2 pink-text">40%</h2>`,
  'caption-da': 'Spar op til</br><span class="pink-text">40%</span>',
  'heading-da': `<h2 id="shops" class="n-h2">Spar op til</h2>
    <h2 id="shops" class="n-h2 pink-text">40%</h2>`
  },
  upto30: {
    'caption-en': 'Save up to</br><span class="pink-text">30%</span>',
    catId: 'c71b7386-a61f-4388-aa13-7ea018599e2d',
    'heading-en': `<h2 id="shops" class="n-h2">Save up to</h2>
      <h2 id="shops" class="n-h2 pink-text">30%</h2>`,
    'caption-da': 'Spar op til</br><span class="pink-text">30%</span>',
    'heading-da': `<h2 id="shops" class="n-h2">Spar op til</h2>
      <h2 id="shops" class="n-h2 pink-text">30%</h2>`
  },
  upto20: {
    'caption-en': 'Save up to</br><span class="pink-text">20%</span>',
    catId: '3cd1f971-b82d-4812-a8e9-f213e9a1bdf8',
    'heading-en': `<h2 id="shops" class="n-h2">Save up to</h2>
      <h2 id="shops" class="n-h2 pink-text">20%</h2>`,
    'caption-da': 'Spar op til</br><span class="pink-text">20%</span>',
    'heading-da': `<h2 id="shops" class="n-h2">Spar op til</h2>
      <h2 id="shops" class="n-h2 pink-text">20%</h2>`
  }
};
Weglot.on('initialized', ()=> {
  language = Weglot.getCurrentLang();
  config = {
    allShops: {
      selector: '.n-featured-shops-wrapper .all-shop-list-wrapper',
      templateGetter: 'getAllShop',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        PageSize: 24,
        Language: language,
        display: true,
        SortBy: 'CreatedDate',
        Ascending: false
      },
      version: 'v2',
      structure: 'data.result',
      after: 'getAllShop',
      setPage: true
    },
    allShopsBlackWeek: {
      selector: '.n-featured-shops-wrapper .all-shop-list-wrapper',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        PageSize: 24,
        Language: language,
        display: true,
        SortBy: 'CreatedDate',
        Ascending: false
      },
      version: 'v2',
      structure: 'data.result',
      after: 'getAllShop',
      setPage: true
    },
    featuredShops: {
      selector: '.n-shops .n-featured-shops-wrapper .swiper-wrapper .swiper-slide',
      templateGetter: 'getFeaturedShop',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        PageSize: 50,
        Language: language,
        Featured: true,
        display: true
      },
      version: 'v2',
      structure: 'data.result'
    },
    featuredShopsError: {
      selector: '.n-search-error-wrapper .slider-search-error .swiper-wrapper .swiper-slide',
      templateGetter: 'getFeaturedShop',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        PageSize: 50,
        Language: language,
        Featured: true,
        display: true
      },
      version: 'v2',
      structure: 'data.result'
    },
    featuredShopSwiper: {
      selector: '.swiper-box.featured-home .swiper-wrapper .swiper-slide',
      templateGetter: 'getFeaturedShop',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        PageSize: 50,
        Language: language,
        Featured: true,
        display: true
      },
      version: 'v2',
      structure: 'data.result'
    },
    featuredShopSwiperShopper: {
      selector: '.swiper-box.featured-shoppers .swiper-wrapper .swiper-slide',
      templateGetter: 'getFeaturedShop',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        PageSize: 50,
        Language: language,
        Featured: true,
        display: true
      },
      version: 'v2',
      structure: 'data.result'
    },
    lastestShopSwiper: {
      selector: '.latest-added .swiper .swiper-wrapper .swiper-slide',
      templateGetter: 'getFeaturedShop',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        PageSize: 50,
        Language: language,
        display: true,
        SortBy: 'CreatedDate',
        Ascending: false
      },
      version: 'v2',
      structure: 'data.result'
    },
    categories: {
      selector: '.n-checkbox-wrapper',
      templateGetter: 'getCategory',
      endpoint: 'categories',
      method: 'GET',
      queryParameters: {
        Language: language,
      },
      version: 'v1',
      structure: 'data',
      after: 'getCategory'
    },
    categoriesBlackWeek: {
      selector: '.n-checkbox-wrapper',
      templateGetter: 'getCategory',
      endpoint: 'categories',
      method: 'GET',
      queryParameters: {
        Language: language,
      },
      version: 'v1',
      structure: 'data.subCategories'
    },
    categoriesMenu: {
      selector: '.n-categories-grid-mega-menu',
      templateGetter: 'getCategoryMenu',
      endpoint: 'categories',
      method: 'GET',
      queryParameters: {
        Language: language,
      },
      version: 'v1',
      structure: 'data',
      after: 'getCategoryMenu'
    },
    featuredShopsMenu: {
      selector: '.n-menu-wrapper-featured .n-mm-feat-store-grid',
      templateGetter: 'getFeaturedShopMenu',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        PageSize: 50,
        Language: language,
        Featured: true
      },
      limit: 6,
      version: 'v2',
      structure: 'data.result',
      after: 'getFeaturedShopMenu',
      randomizeData: true
    },
    swiper25to50offall: {
      selector: '.swiper-box .swiper._25-to-50 .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        display: true,
        CategoryIds: ['7a418f22-85f1-4f6c-997e-7390dccf3229']
      },
      version: 'v2',
      structure: 'data.result'
    },
    swiper25offall: {
      selector: '.swiper-box .swiper._25 .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        display: true,
        CategoryIds: ['9849bf3f-63d9-4305-8610-c1d87f258f5d']
      },
      version: 'v2',
      structure: 'data.result'
    },
    swiperupto80: {
      selector: '.swiper-box .swiper.up-to-80 .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        display: true,
        CategoryIds: ['b722cea6-8fea-4870-a1e4-57b8a44e807d']
      },
      version: 'v2',
      structure: 'data.result'
    },
    swiperupto70: {
      selector: '.swiper-box .swiper.up-to-70 .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        display: true,
        CategoryIds: ['8240993c-6dfc-42f0-98ba-dd0c4830990f']
      },
      version: 'v2',
      structure: 'data.result'
    },
    swiperupto60: {
      selector: '.swiper-box .swiper.up-to-60 .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        display: true,
        CategoryIds: ['069c7108-fa76-48b0-aca3-61b751f2324e']
      },
      version: 'v2',
      structure: 'data.result'
    },
    swiperupto50: {
      selector: '.swiper-box .swiper.up-to-50 .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        display: true,
        CategoryIds: ['2a9a6112-65b1-4d5f-a3f2-aec68b9075f4']
      },
      version: 'v2',
      structure: 'data.result'
    },
    swiperupto40: {
      selector: '.swiper-box .swiper.up-to-40 .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        display: true,
        CategoryIds: ['66b92fdb-d6cf-4628-be21-7e0ef9479206']
      },
      version: 'v2',
      structure: 'data.result'
    },
    swiperupto30: {
      selector: '.swiper-box .swiper.up-to-30 .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        display: true,
        CategoryIds: ['c71b7386-a61f-4388-aa13-7ea018599e2d']
      },
      version: 'v2',
      structure: 'data.result'
    },
    swiperupto20: {
      selector: '.swiper-box .swiper.up-to-20 .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        CategoryIds: ['3cd1f971-b82d-4812-a8e9-f213e9a1bdf8'],
        display: true
      },
      version: 'v2',
      structure: 'data.result'
    },
    swiperdealhome: {
      selector: '.swiper-box .swiper.black-week-swiper .swiper-wrapper .swiper-slide',
      templateGetter: 'getAllShopBackWeek',
      endpoint: 'shops',
      method: 'GET',
      queryParameters: {
        Language: language,
        CategoryIds: allDealCategories,
        display: true
      },
      version: 'v2',
      structure: 'data.result'
    }
  };
  var isShopsPage = $('.n-section.shops .n-shops-wrapper .n-shops-sorting').length ? true : false;
  var isBlackweekPage = $('.n-section.hero.black-week.wf-section').length ? true : false;
  if (isBlackweekPage) {
    $('.n-filters-wrapper.n-hidden-on-devices .n-item-filters').empty();
    $('.n-bw-page-heading-wrapper').html('<h2 class "n-h2">All deals</h2>');
    Object.keys(discountCategories).forEach(function(k){
      $('.n-filters-wrapper.n-hidden-on-devices .n-item-filters').append(
        `<div class="n-checkbox-wrapper-bw" data-cat-id="${discountCategories[k].catId}" data-key="${k}">
        <div class="n-checkbox-label-categories">${discountCategories[k]['caption-'+language]}</div>
        <div class="n-checkbox-bw"></div>
        </div>`
        );
        $('.n-filters-wrapper.n-hidden-on-devices .n-item-filters .n-checkbox-wrapper-bw:first').addClass('selected');
    });

    $('.n-filters-wrapper.n-hidden-on-devices .n-item-filters .n-checkbox-wrapper-bw').click(function () {
      $('.n-filters-wrapper.n-hidden-on-devices .n-item-filters .n-checkbox-wrapper-bw.selected').each(function (index) {
        $(this).removeClass('selected');
      });
      $('div.w-checkbox-input').removeClass('w--redirected-checked');
      $(this).addClass('selected');
      if ($(this).data('cat-id') == '')
        createElements({ ...config.categories, endpoint: 'categories' }).then(count => $('.n-item-filters').show());
      else
        createElements({ ...config.categoriesBlackWeek, endpoint: 'categories/'+$(this).data('cat-id') }).then(count => $('.n-item-filters').show());
      $('.n-shops .n-featured-shops-wrapper:first').hide();
      $('.n-bw-page-heading-wrapper').html(discountCategories[$(this).data('key')]['heading-'+language]);
      filterDiscountShops();
    });

    if (!getSelectedCategory().length && getSelectedDiscountCategory() === '') {
      var id;
      if (dealCatIdParam) {
        id = dealCatIdParam;
        $('.n-shops .n-featured-shops-wrapper:first').hide();
        $('.n-filters-wrapper.n-hidden-on-devices .n-item-filters .n-checkbox-wrapper-bw.selected').each(function (index) {
          $(this).removeClass('selected');
        });
      } else {
        id = catIdParam
      }
      if (!id) {
        id = allDealCategories;
      }
      $('.n-filters-wrapper.n-hidden-on-devices .n-item-filters .n-checkbox-wrapper-bw').each(function (index) {
        if($(this).data('cat-id') == dealCatIdParam)
          $(this).addClass('selected');
      });
      createElements({ ...config.allShopsBlackWeek, queryParameters: { ...config.allShops.queryParameters, CategoryIds: id, PageSize: 175 }, limit: 175 });
    } else {
      filterDiscountShops();
    }
    $('.n-filters-wrapper').unbind('click').on('click', '.n-item-filters.w-dyn-item', function (event) {
      if ($(this).attr('data-checker')) {
        $('.n-item-filters.w-dyn-item').removeAttr('data-checker');
        return false;
      } else {
        $(this).attr('data-checker', 1);
      }
      
      if (!$(this).hasClass('n-item-filters')) return;
      var catArray = [];
      if (!$(this).find("div.w-checkbox-input").hasClass('w--redirected-checked')) {
        $('div.w-checkbox-input').removeClass('w--redirected-checked');
        catArray.push($(this).children().data('cat-id'));
        if (catArray.length) {
          filterDiscountShops(catArray);
          $('.n-shops .n-featured-shops-wrapper:first').hide();
        }
      } else {
        $('div.w-checkbox-input').removeClass('w--redirected-checked');
        filterDiscountShops();
        $('.n-shops .n-featured-shops-wrapper:first').show();
        $('.n-filters-shops .n-h3').html('All');
        return false;
      }
      $('.n-filters-shops .n-h3').html($(this).find('.n-checkbox-label-categories').html());
      $(this).find('.w-checkbox-input').addClass('w--redirected-checked');
      $('.n-search-wrapper .n-search-input').val('');
    });
  }
  if ($('.swiper-box.featured-black-week-home').length || $('.swiper-box .swiper.black-week-swiper').length) {
    createSlider(config.swiperdealhome);
  }
  
  if(isShopsPage) {
    if (catIdParam) {
      createElements({ ...config.allShops, queryParameters: { ...config.allShops.queryParameters, CategoryIds: catIdParam } });
      $('.n-shops .n-featured-shops-wrapper:first').hide();
    } else {
      createElements(config.allShops);
    }
  }
  if (isShopsPage || isBlackweekPage) {
    createElements(config.categories).then(count => $('.n-item-filters').show());
    var storageFeatured = window.localStorage.getItem('featured' + language);
    if (storageFeatured && JSON.parse(storageFeatured).expiry > Date.now()) {
      createSlider(config.featuredShops, JSON.parse(storageFeatured).shops);
      createSlider(config.featuredShopsError, JSON.parse(storageFeatured).shops);
    } else {
      window.localStorage.removeItem('featured' + language);
      createSlider(config.featuredShops);
      createSlider(config.featuredShopsError);
    }
  }
    
  if ($('.swiper-box.featured-home').length) {
    var storageFeatured = window.localStorage.getItem('featured'+language);
    if (storageFeatured && JSON.parse(storageFeatured).expiry > Date.now())
    createSlider(config.featuredShopSwiper, JSON.parse(storageFeatured).shops);
    else
    createSlider(config.featuredShopSwiper);
    createSlider(config.lastestShopSwiper);
  }
    
  if ($('.featured-shoppers').length) {
    var storageFeatured = window.localStorage.getItem('featured'+language);
    if (storageFeatured && JSON.parse(storageFeatured).expiry > Date.now())
    createSlider(config.featuredShopSwiperShopper, JSON.parse(storageFeatured).shops);
    else
    createSlider(config.featuredShopSwiperShopper);
  }
  
  var storageCategory = window.localStorage.getItem('category'+language);
  if (storageCategory && JSON.parse(storageCategory).expiry > Date.now()) {
    createElements(config.categoriesMenu, JSON.parse(storageCategory).categories)
  } else {
    window.localStorage.removeItem('category'+language);
    createElements(config.categoriesMenu);
  }
  var storageFeatured = window.localStorage.getItem('featured'+language);
  if (storageFeatured && JSON.parse(storageFeatured).expiry > Date.now()) {
    createElements(config.featuredShopsMenu, JSON.parse(storageFeatured).shops)
  } else {
    window.localStorage.removeItem('featured'+language);
    createElements(config.featuredShopsMenu);
  }
  
  if ($('body .n-wrapper-heading-subheading._100').length) {
    createSlider(config.swiper25to50offall);
    createSlider(config.swiper25offall);
    createSlider(config.swiperupto80);
    createSlider(config.swiperupto70);
    createSlider(config.swiperupto60);
    createSlider(config.swiperupto50);
    createSlider(config.swiperupto40);
    createSlider(config.swiperupto30);
    createSlider(config.swiperupto20);
  }
});
  
async function filterDiscountShops(filteredCat = '') {
  var discountCat = getSelectedDiscountCategory();
  var searchTerm = '';
  var setPage = false;
  if(filteredCat === '')
    filteredCat = getSelectedCategory();
  if ($('.n-search-wrapper .n-search-input.shop.w-input').val().trim().length) {
    searchTerm = $('.n-search-wrapper .n-search-input.shop.w-input').val().trim();
  }
  var configAll = { ...config.allShops, queryParameters: { ...config.allShops.queryParameters, PageSize: 175, Search: searchTerm }, limit: 175 };
  if ($('.n-search-input.w-input').val().trim().length) {
    configAll = { ...config.allShops, queryParameters: { ...config.allShops.queryParameters, Search: $('.n-search-input.w-input').val().trim() } };
  }
  if (discountCat === '' && !filteredCat.length) {
    discountCat = allDealCategories;
    setPage = true;
  }
  var discountedConfig = { ...configAll, queryParameters: { ...configAll.queryParameters, CategoryIds: discountCat } };
  var filteredConfig = { ...configAll, queryParameters: { ...configAll.queryParameters, CategoryIds: [filteredCat] } };
  var discounted = await anydayAPI(discountedConfig.endpoint,
    discountedConfig.method,
    discountedConfig.queryParameters,
    discountedConfig.version,
    discountedConfig.structure,
    false);
  
  if (filteredCat != '') {
    var filtered = await anydayAPI(filteredConfig.endpoint,
      filteredConfig.method,
      filteredConfig.queryParameters,
      filteredConfig.version,
      filteredConfig.structure,
      false);
  }

  var finalShops;
  if (filteredCat != '') {
    finalShops = filtered;
  } else {
    finalShops = discounted;
  }
  finalShops = finalShops.map(shop => {
    var shopUrlArray = shop.marketingUrl ? shop.marketingUrl.split('utm_medium') : [];
    if (shopUrlArray.length > 1) {
      shopUrlArray[1] = "utm_medium=website&amp;utm_campaign=blackweek";
      shop.marketingUrl = shopUrlArray.join('');
    }
    return shop;
  });
  var html = "";
  var limit = configAll.limit ? configAll.limit : finalShops.length;
  html += (configAll.before && getBefore(configAll.before, finalShops) !== null) ? getBefore(configAll.before, finalShops) : '';
  for (let i = 0; i < limit; i++) {
    html += getTemplate(configAll.templateGetter, finalShops[i]);
  }
  if (configAll.randomizeData) {
    finalShops = origData;
  }
  html += (configAll.after && getAfter(configAll.after, finalShops) !== null) ? getAfter(configAll.after, finalShops) : '';
  $(configAll.selector).first().html('');
  $(configAll.selector).first().html(html);

  if (!finalShops.length) {
    $('.n-search-error-wrapper').show();
    $('.n-pagination').hide();
    $('html, body').animate({
      scrollTop: $(".n-search-error-wrapper .n-search-error-text").offset().top - 100
    }, 1000);
  } else {
    $('.n-search-error-wrapper').hide();
    $('.n-pagination').hide();
    $('.n-filters-dropdown.w-dropdown').hide();
    $('html, body').animate({
      scrollTop: $(".n-filters-shops .n-h3").offset().top - 100
    }, 1000);
  }
}

function getTemplate(name,data) {
  var templatesFunctions = {
    'getAllShop': function (data) {
      if (!data) {
        return '';
      }
      var imageUrl = "https://uploads-ssl.webflow.com/630f0a12999419c9747bd320/63328cd7b24127bb78ef71c2_Frame%20631786.svg";
      if (data.featuredBannerImages.length) {
        imageUrl = data.featuredBannerImages[0].url
      }
      var category = '';
      if (data.mainCategory) {
        category = data.mainCategory.name;
      }
      
      var logoImageUrl = "https://uploads-ssl.webflow.com/630f0a12999419c9747bd320/63328cd7b24127bb78ef71c2_Frame%20631786.svg";
      if (data.logoImages.length) {
        logoImageUrl = data.logoImages[0].url;
      }
      
      return `
      <div class="n-wrapper-store-card">
      <a href="${data.marketingUrl}" class="n-store-link w-inline-block"></a>
      <div class="n-store-image-wrapper"><img src="${imageUrl}" alt="" class="n-store-image">
      <div class="n-logo-wrapper"><img src="${logoImageUrl}" alt="" class="n-shop-logo"></div>
      </div>
      <div fs-cmsfilter-field="name" class="n-shop-name">${truncateString(data.name)}</div>
      <div class="n-card-category-name">${category}</div>
      </div>
      `;
    },
    'getAllShopBackWeek': function (data) {
      if (!data) {
        return '';
      }
      var imageUrl = "https://uploads-ssl.webflow.com/630f0a12999419c9747bd320/63328cd7b24127bb78ef71c2_Frame%20631786.svg";
      if (data.featuredBannerImages.length) {
        imageUrl = data.featuredBannerImages[0].url
      }
      var category = '';
      if (data.mainCategory) {
        category = data.mainCategory.name;
      }
      
      var logoImageUrl = "https://uploads-ssl.webflow.com/630f0a12999419c9747bd320/63328cd7b24127bb78ef71c2_Frame%20631786.svg";
      if (data.logoImages.length) {
        logoImageUrl = data.logoImages[0].url;
      }

      var shopUrlArray = data.marketingUrl ? data.marketingUrl.split('utm_medium') : [];
      if (shopUrlArray.length > 1) {
        shopUrlArray[1] = "utm_medium=website&amp;utm_campaign=blackweek";
        data.marketingUrl = shopUrlArray.join('');
      }
      
      return `
      <div class="n-wrapper-store-card">
      <a href="${data.marketingUrl}" class="n-store-link w-inline-block"></a>
      <div class="n-store-image-wrapper"><img src="${imageUrl}" alt="" class="n-store-image">
      <div class="n-logo-wrapper"><img src="${logoImageUrl}" alt="" class="n-shop-logo"></div>
      </div>
      <div fs-cmsfilter-field="name" class="n-shop-name">${truncateString(data.name)}</div>
      <div class="n-card-category-name">${category}</div>
      </div>
      `;
    },
    'getFeaturedShop': function(data) {
      if (!data /*|| !data.display*/) {
        return '';
      }
      var imageUrl = "https://uploads-ssl.webflow.com/630f0a12999419c9747bd320/63328cd7b24127bb78ef71c2_Frame%20631786.svg";
      if (data.featuredBannerImages.length) {
        imageUrl = data.featuredBannerImages[0].url
      }
      var category = '';
      if (data.mainCategory) {
        category = data.mainCategory.name;
      }
      
      return `
      <div class="n-wrapper-store-card">
      <a href="${data.marketingUrl}" class="n-store-link w-inline-block"></a>
      <div class="n-store-image-wrapper"><img src="${imageUrl}" alt="" class="n-store-image">
      <div class="n-logo-wrapper"><img src="${data.logoImages[0].url}" alt="" class="n-shop-logo"></div>
      </div>
      <div fs-cmsfilter-field="name" class="n-shop-name">${truncateString(data.name)}</div>
      <div class="n-card-category-name">${category}</div>
      </div>
      `;
    },
    'getCategory': function (data) {
      if (allDealCategories.includes(data.id))
        return '';
      var activateClass = '';
      if (data.id == catIdParam) {
        activateClass = "w--redirected-checked";
      }
      return data ? `<div role="listitem" class="n-item-filters w-dyn-item">
      <label class="w-checkbox n-checkbox-wrapper" data-cat-id="${data.id}">
      <div class="w-checkbox-input w-checkbox-input--inputType-custom n-checkbox ${activateClass}"></div>
      <input type="checkbox" name="checkbox-2" data-name="Checkbox 2" style="opacity:0;position:absolute;z-index:-1">
      <span class="n-checkbox-label-categories w-form-label" for="checkbox-2">
      ${data.name}
      </span>
      </label>
      </div>` : null;
    },
    'getSubCategory': function(data) {
      var data = data.data;
      return `
      <div class="n-tab-text n-hidden-on-devices" data-cat-id="${data.id}">${data.name}</div>
      `;
    },
    'getCategoryMenu': function (data) {
      if (allDealCategories.includes(data.id))
        return '';
      return `
      <a href="/shop?cat-id=${data.id}" class="n-categories w-dropdown-link" tabindex="0">${data.name}</a>
      `;
    },
    'getFeaturedShopMenu': function (data) {
      if (!data) {
        return;
      }
      var imageUrl = "https://uploads-ssl.webflow.com/630f0a1299941995d67bd323/630f0a13999419760a7be359_ergoliving.dk.png";
      if (data.featuredBannerImages.length) {
        imageUrl = data.featuredBannerImages[0].url
      }
      
      var category = '';
      if (data.mainCategory) {
        category = `<div class="n-card-category-name">${data.mainCategory.name}</div>`;
      }
      
      var logoImageUrl = "https://uploads-ssl.webflow.com/630f0a12999419c9747bd320/63328cd7b24127bb78ef71c2_Frame%20631786.svg";
      if (data.logoImages.length) {
        logoImageUrl = data.logoImages[0].url;
      }
      
      return `
      <a id="w-node-ecf96125-5766-0774-c695-12f25e3a5a9f-68400413" href="${data.marketingUrl}" class="n-megamenu-fav-wrapper n-padding-vertical n-padding-xsmall w-inline-block" tabindex="0">
      <div class="n-mm-fav-card-image-wrapper"><img src="${imageUrl}" loading="lazy" alt="" class="n-fav-store-image">
      <div class="n-logo-wrapper-mega-menu"><img src="${logoImageUrl}" loading="lazy" alt="" class="n-shop-logo-mega-menu"></div>
      </div>
      <div class="n-mm-feat-store-name n-padding-top n-padding-xsmall">${data.name}</div>
      ${category}
      </a>
      `;
    }
  }
  return templatesFunctions[name](data);
}
  
function getBefore(name, data) {
  var beforeFunctions = {
    'getAllShop': function (data) {
      return '';
    },
    'getFeaturedShop': function(data) {
      return ``;
    },
    'getCategory': function (data) {
      return '';
    }
  }
  return beforeFunctions[name] ? beforeFunctions[name](data) : null;
}
  
function getAfter(name, data) {
  var afterFunctions = {
    'getAllShop': function (data) {
      if (data && data.length) {
        $('.n-featured-shops-wrapper .w-dyn-empty').hide();
        $('.n-shops-collection-list').show();
      } else {
        $('.n-featured-shops-wrapper .w-dyn-empty').show();
        $('.n-shops-collection-list').hide();
      }
      return '';
    },
    'getFeaturedShop': function (data) {
      $(window).trigger('resize');
      return (data && data.length) ? `
      <div class="left-arrow w-slider-arrow-left" role="button" tabindex="0" aria-controls="w-slider-mask-0" aria-label="previous slide">
      <div class="n-arrow-div"><img src="https://uploads-ssl.webflow.com/630f0a12999419c9747bd320/632a8e5b94c9d18695b01993_Vector%20119.svg" alt=""></div>
      <div class="icon-2 hidden w-icon-slider-left"></div>
      </div>
      <div class="right-arrow w-slider-arrow-right" role="button" tabindex="0" aria-controls="w-slider-mask-0" aria-label="next slide">
      <div class="n-arrow-div"><img src="https://uploads-ssl.webflow.com/630f0a12999419c9747bd320/632a90cd32d85fda4a8b9b2f_Vector%20120.svg" alt=""></div>
      <div class="icon-2 hidden w-icon-slider-right"></div>
      </div>
      ` : '';
    },
    'getCategory': function (data) {
      window.categories = data;
      var selectedCat = data.filter(cat => cat.id == catIdParam);
      if(selectedCat.length)
      $('.n-filters-shops .n-h3').html(selectedCat[0].name);
      return '';
    },
    'getCategoryMenu': function (data) {
      var localCategory = window.localStorage.getItem('category'+language);
      if (localCategory === null) {
        const today = new Date();
        var tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        window.localStorage.setItem('category'+language, JSON.stringify({ categories: data, expiry: tomorrow.getTime()}));
      }
      $('.parent .sibling.absolute .n-category-name').remove();
      $('.parent .sibling.absolute').append(createCategoryMobileMenu(data));
      $('.n-filters-wrapper.n-disappear-on-desktop .sibling.absolute .n-category-name').remove();
      $('.n-filters-wrapper.n-disappear-on-desktop .sibling.absolute').append(createCategoryMobileMenu(data));
      if (data.length)
      $('.n-menu-wrapper-categories .w-dyn-empty').first().hide();
      else
      $('.n-menu-wrapper-categories .w-dyn-empty').first().show();
      return '';
    },
    'getFeaturedShopMenu': function (data) {
      var localFeatured = window.localStorage.getItem('featured'+language);
      if (localFeatured === null) {
        const today = new Date();
        var tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        window.localStorage.setItem('featured'+language, JSON.stringify({ shops: data, expiry: tomorrow.getTime()}));
      }
      if (data.length)
      $('.n-menu-wrapper-featured .w-dyn-empty').hide();
      else
      $('.n-menu-wrapper-featured .w-dyn-empty').show();
      return '';
    }
  }
  return afterFunctions[name] ? afterFunctions[name](data) : null;
}
  
async function createElements(config, data) {
  var html = "";
  var origData;
  if (data === undefined) {
    try {
      data = await anydayAPI(
        config.endpoint,
        config.method,
        config.queryParameters,
        config.version,
        config.structure,
        config.setPage ? config.setPage : undefined
      );
    } catch (e) {
      console.log('Error occured while getting response from ' + config.endpoint);
      console.log(e);
      return;
    }
  }
  if (config.randomizeData) {
    if (data.length) {
      var randomIndex = [];
      var recLimit = Math.min(data.length, config.limit)
      while(randomIndex.length < recLimit){
        var r = Math.floor(Math.random() * data.length);
        if(randomIndex.indexOf(r) === -1) randomIndex.push(r);
      };
      var randomData = randomIndex.map(index => data[index]);
      origData = data;
      data = randomData;
    }
  }

  var limit = config.limit ? config.limit : data.length;
  html += (config.before && getBefore(config.before, data) !== null) ? getBefore(config.before, data) : '';
  for (let i = 0; i < limit; i++) {
    html += getTemplate(config.templateGetter, data[i]);
  }
  if (config.randomizeData) {
    data = origData;
  }
  html += (config.after && getAfter(config.after, data) !== null) ? getAfter(config.after, data) : '';
  $(config.selector).first().html('');
  $(config.selector).first().html(html);
  return data.length;
}

async function createSlider(config, data) {
  var html = "";
  if (data === undefined) {
    try {
      var data = await anydayAPI(
        config.endpoint,
        config.method,
        config.queryParameters,
        config.version,
        config.structure
        );
    } catch (e) {
        console.log('Error occured while getting response from ' + config.endpoint);
        console.log(e);
        return;
    }
  }
  if (data.length) {
    var elements = $(config.selector);
    var randomIndex = [];
    var recLimit = Math.min(data.length, elements.length);
    while(randomIndex.length < recLimit){
      var r = Math.floor(Math.random() * data.length);
      if(randomIndex.indexOf(r) === -1) randomIndex.push(r);
    };
    var randomData = randomIndex.map(index => data[index]);
    elements.each(function (index) {
      $(this).html('');
      $(this).html(getTemplate(config.templateGetter, randomData[index]));
    });
  }
}
      
async function anydayAPI(path, method = "GET", data, version, structure, setPage) {
  const BASE_URL = "https://my.anyday.io/api/"+version+"/internal/";
  queryString = "";
  if (method === "GET" && data !== undefined) {
    var queryString = Object.keys(data).map(function (key) {
      if (key === 'CategoryIds' && Array.isArray(data[key])) {
        var categoriesIds = data[key];
        return Object.keys(categoriesIds).map(function (index) {
          return 'CategoryIds=' + categoriesIds[index];
        }).join('&');
      }
      return key + '=' + data[key];
    }).join('&');
    queryString = "?" + queryString;
  }
  var response = await $.get(BASE_URL + path.trim() + queryString);
  if (setPage) {
    $('.n-pagination .previous-button, .n-pagination .load-more-button').removeClass('hidden').removeData('page');
    if (response.data.totalPages == 1) {
      $('.n-pagination .previous-button, .n-pagination .load-more-button').addClass('hidden');
    } else if(response.data.page === response.data.totalPages) {
      $('.n-pagination .load-more-button').addClass('hidden');
      $('.n-pagination .previous-button').attr('data-page', response.data.page - 1);
    } else {
      if (response.data.page === 1) {
        $('.n-pagination .previous-button').addClass('hidden');
        $('.n-pagination .load-more-button').attr('data-page', response.data.page + 1);
      } else {
        $('.n-pagination .load-more-button').attr('data-page', response.data.page + 1);
        $('.n-pagination .previous-button').attr('data-page', response.data.page - 1);
      }
    }
  }
  return processResponse(response, structure);
}
      
function processResponse(response, structure) {
  structure = structure.split(".");
  for (let i = 0; i < structure.length; i++) {
    response = response[structure[i]];
  }
  return response;
}
      
function displaySubcategory(catArray) {
  var categories = window.categories;
  categories = categories.filter(cat => catArray.includes(cat.id));
  var sub = [].concat(...categories.map(cat => cat['subCategories'] ? cat['subCategories'] : []));
  var html = "";
  for (let i = 0; i < sub.length; i++) {
    html += getTemplate('getSubCategory', { data: sub[i], index: i });
  }
  $('.n-subcategories-wrapper-div').html(html)
  $('.n-subcategories-wrapper-div').show();
  $('.n-subcategories-wrapper-div .n-tab-text').show()
}
      
function escapeHtml(unsafe) {
  return unsafe
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
}
      
function truncateString(string = '', maxLength = 24) {
  return string.length > maxLength
  ? `${string.substring(0, maxLength)}…`
  : string;
}
      
function createCategoryMobileMenu(data) {
  data = data.filter(cat => !allDealCategories.includes(cat.id));
  return `<div class="n-category-name">
    <div class="sibling">
    <div class="n-mm-menu-link"><a href="/shop">All</a></div>
    </div>` +
    data.map(cat => {
    var html = `<div class="n-category-name">
    <div data-w-id="${cat.id}" class="sibling">
    <div class="n-mm-menu-link"><a href="/shop?cat-id=${cat.id}">${cat.name}</a></div>
    </div>
    <div style="display: none; transform: translate3d(100vw, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg); transform-style: preserve-3d;" class="sibling-2 absolute">
    <div data-w-id="${cat.id}" class="n-mm-menu-header"><img src="https://uploads-ssl.webflow.com/630f0a12999419c9747bd320/632833cd94be2a75c049ba1d_Icon%20(39).svg" loading="lazy" alt="" class="n-mm-back">
    <div class="n-mm-header-link">Back to categories</div>
    </div>
    <div class="n-mm-menu-item-wrapper">
    <div class="n-mm-menu-heading">${cat.name}</div>
    </div>
    `;
    html += `<div class="n-mm-menu-item-wrapper">
    <a href="/shop?cat-id=${cat.id}" class="n-subcategory-name">View All</a>
    </div>`;
    html += cat.subCategories.map(subcat => {
      return `<div class="n-mm-menu-item-wrapper">
      <a href="/shop?cat-id=${subcat.id}" class="n-subcategory-name">${subcat.name}</a>
      </div>`
    }).join('');
    html += `</div>
    </div>`;
    return html;
  }).join('');
}
      
function collectShopParameter(param = {}) {
  var shopConfig;
  var catArray = [];
  shopConfig = { ...config.allShops, queryParameters: { ...config.allShops.queryParameters, SortBy: 'name' } };
  $('.n-list-filters-emp-copy .w--redirected-checked').each(function () {
    catArray.push($(this).closest("label").data('cat-id'));
  });
  if (catArray.length) {
    shopConfig = { ...shopConfig, queryParameters: { ...shopConfig.queryParameters, CategoryIds: catArray } };
  }
  if ($('.n-search-input.w-input').val().trim().length) {
    shopConfig = { ...shopConfig, queryParameters: { ...shopConfig.queryParameters, Search: escapeHtml($('.n-search-input.w-input').val()) } };
  }
  if ($('#w-dropdown-list-1').attr('data-sort-decending') && parseInt($('#w-dropdown-list-1').attr('data-sort-decending')) == 1) {
    shopConfig = { ...shopConfig, queryParameters: { ...shopConfig.queryParameters, SortBy: 'name', Ascending: false } };
  } else if ($('#w-dropdown-list-1').attr('data-sort-decending') && parseInt($('#w-dropdown-list-1').attr('data-sort-decending')) == 0) {
    shopConfig = { ...shopConfig, queryParameters: { ...shopConfig.queryParameters, SortBy: 'name', Ascending: true} };
  } else {
    shopConfig = { ...shopConfig, queryParameters: { ...shopConfig.queryParameters, SortBy: 'CreatedDate', Ascending: false} };
  }
  
  if (!$.isEmptyObject(param)) {
    shopConfig = { ...shopConfig, queryParameters: { ...shopConfig.queryParameters, ...param } };
  }
  if ($('.n-section.hero.black-week.wf-section').length && !getSelectedCategory().length && getSelectedDiscountCategory() === '') {
    shopConfig = { ...shopConfig, queryParameters: { ...shopConfig.queryParameters, CategoryIds: allDealCategories } };
  }
  return shopConfig;
}

function getSelectedDiscountCategory() {
  return $('.n-filters-wrapper.n-hidden-on-devices .n-item-filters .n-checkbox-wrapper-bw.selected').data('cat-id');
}

function getSelectedCategory() {
  var catArray = [];
  $('.n-list-filters-emp-copy .w--redirected-checked').each(function () {
    catArray.push($(this).closest("label").data('cat-id'));
  });
  return catArray
}
      
document.addEventListener('DOMContentLoaded', function () {
  var isShopsPage = $('.n-section.shops .n-shops-wrapper .n-shops-sorting').length ? true : false;
  var isBlackweekPage = $('.n-section.hero.black-week.wf-section').length ? true : false;
  var swiper = new Swiper(".n-shops .n-featured-shops-wrapper .swiper", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.n-shops .n-featured-shops-wrapper .swiper .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var errSectionSwiper = new Swiper(".slider-search-error .swiper", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.slider-search-error .swiper .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var homeFeaturedSwiper = new Swiper(".featured-home .swiper", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.featured-home .swiper .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var homeLatestSwiper = new Swiper(".latest-added .swiper", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.latest-added .swiper .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var shopperFeaturedSwiper = new Swiper(".featured-shoppers .swiper", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.featured-shoppers .swiper .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var varswiper25to50offall = new Swiper(".swiper-box .swiper._25-to-50", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper._25-to-50 .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var varswiper25offall = new Swiper(".swiper-box .swiper._25", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper-box .swiper._25 .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var varswiperupto80 = new Swiper(".swiper-box .swiper.up-to-80", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper-box .swiper.up-to-80 .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var varswiperupto70 = new Swiper(".swiper-box .swiper.up-to-70", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper-box .swiper.up-to-70 .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var varswiperupto60 = new Swiper(".swiper-box .swiper.up-to-60", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper-box .swiper.up-to-60 .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var varswiperupto50 = new Swiper(".swiper-box .swiper.up-to-50", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper-box .swiper.up-to-50 .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var varswiperupto40 = new Swiper(".swiper-box .swiper.up-to-40", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper-box .swiper.up-to-40 .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var varswiperupto30 = new Swiper(".swiper-box .swiper.up-to-30", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper-box .swiper.up-to-30 .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  var varswiperupto20 = new Swiper(".swiper-box .swiper.up-to-20", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper-box .swiper.up-to-20 .swiper-wrapper').css({display: 'flex'});
      }
    }
  });

  var varswiperdealhome = new Swiper(".swiper-box .swiper.black-week-swiper", {
    slidesPerView: 1.2,
    spaceBetween: 30,
    navigation: {
      nextEl: '.w-slider-arrow-right',
      prevEl: '.w-slider-arrow-left',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 4.5,
        spaceBetween: 30,
      },
    },
    on: {
      init: function() {
        $('.swiper-box .swiper.black-week-swiper .swiper-wrapper').css({display: 'flex'});
      }
    }
  });
  
  // $(".btn-login").click(function () {
  //   console.log('login clicked!');
  //   window.rudderanalytics.track('Login Click');
  // });
  // $(".btn-signup, .hero-shoppers").click(function () {
  //   console.log('signup clicked!');
  //   window.rudderanalytics.track('Signup Click');
  // });
  // $(".shopper-link, body > div.navbar.no-dropdown.w-nav > div.container-width-100.nav-container.w-container > div > div.div-block-42 > nav > div.div-block-256 > div.div-block-73 > div > a:nth-child(1)").click(function () {
  //   console.log('shopper clicked!');
  //   window.rudderanalytics.track('Shopper Click');
  // });
  // $(".shop-link, .shop-btn, body > div.navbar.no-dropdown.w-nav > div.container-width-100.nav-container.w-container > div > div.div-block-42 > nav > div.div-block-256 > div.div-block-73 > div > a:nth-child(2)").click(function () {
  //   console.log('shop clicked!');
  //   window.rudderanalytics.track('Shop Click');
  // });
  // $(".webshop-link, .webshops, body > div.navbar.no-dropdown.w-nav > div.container-width-100.nav-container.w-container > div > div.div-block-42 > nav > div.div-block-256 > div.div-block-73 > div > a:nth-child(3)").click(function () {
  //   console.log('webshop clicked!');
  //   window.rudderanalytics.track('webshop Click');
  // });
  // Weglot.on("languageChanged", function () {
  //   console.log('language clicked!');
  //   window.rudderanalytics.track('Language changed');
  // });
  
  $('.previous-button:not(.hidden)').click(function (e) {
    e.preventDefault();
    createElements(collectShopParameter({ Page: $(this).data('page') }))
    .then(function () {
      $('html, body').animate({
        scrollTop: $(".n-filters-shops .n-h3").offset().top - 100
      }, 1000);
    });
  });
  
  $('.load-more-button:not(.hidden)').click(function (e) {
    e.preventDefault();
    createElements(collectShopParameter({ Page: $(this).data('page') }))
    .then(function () {
      $('html, body').animate({
        scrollTop: $(".n-filters-shops .n-h3").offset().top - 100
      }, 1000);
    });
  });

  if (isShopsPage) {
    
    $('.n-filters-wrapper').unbind('click').on('click', '.n-item-filters.w-dyn-item', function (event) {
      if ($(this).attr('data-checker')) {
        $('.n-item-filters.w-dyn-item').removeAttr('data-checker');
        return false;
      } else {
        $(this).attr('data-checker', 1);
      }
      
      if (!$(this).hasClass('n-item-filters')) return;
      var catArray = [];
      if (!$(this).find("div.w-checkbox-input").hasClass('w--redirected-checked')) {
        $('div.w-checkbox-input').removeClass('w--redirected-checked');
        catArray.push($(this).children().data('cat-id'));
        //displaySubcategory(catArray);
        if (catArray.length) {
          createElements({ ...config.allShops, queryParameters: { ...config.allShops.queryParameters, categoryIds: catArray } });
          $('.n-shops .n-featured-shops-wrapper:first').hide();
        }
      } else {
        $('div.w-checkbox-input').removeClass('w--redirected-checked');
        //displaySubcategory(catArray);
        createElements({ ...config.allShops });
        $('.n-shops .n-featured-shops-wrapper:first').show();
        $('.n-filters-shops .n-h3').html('All');
        return false;
      }
      $('.n-filters-shops .n-h3').html($(this).find('.n-checkbox-label-categories').html());
      $(this).find('.w-checkbox-input').addClass('w--redirected-checked');
      $('.n-search-wrapper .n-search-input').val('');
    });

    $('body').on('click', '.n-absolute-elements-search .n-primary-button', function (event) {
      var catArray = [];
      $('.n-list-filters-emp-copy .w--redirected-checked').each(function () {
        catArray.push($(this).closest("label").data('cat-id'));
      });
      createElements({ ...config.allShops, queryParameters: { ...config.allShops.queryParameters, CategoryIds: catArray, Search: escapeHtml($('.n-search-input.w-input').val()) } })
      .then(count => {
        if (!count) {
          $('.n-shops .n-featured-shops-wrapper').hide();
          $('.n-search-error-wrapper').show();
          $('.n-pagination').hide();
          $('.n-filters-dropdown.w-dropdown').show();
          $('html, body').animate({
            scrollTop: $(".n-search-error-wrapper .n-search-error-text").offset().top - 100
          }, 1000);
          
        } else {
          $('.n-shops .n-featured-shops-wrapper').show();
          $('.n-search-error-wrapper').hide();
          $('.n-pagination').show();
          $('.n-filters-dropdown.w-dropdown').show();
          $('html, body').animate({
            scrollTop: $(".n-filters-shops .n-h3").offset().top - 100
          }, 1000);
        }
      });
    });
  }

  if (isBlackweekPage) {
    $('body').on('click', '.n-absolute-elements-search .n-primary-button', function (event) {
      filterDiscountShops()
    });
  }
  
  $('body').on('click', '.n-subcategories-wrapper-div .n-tab-text', function (event) {
    $('.n-tab-subcategories').removeClass('w--current');
    $(this).addClass('w--current');
    var id = $(this).data('cat-id');
    createElements({...config.allShops, queryParameters: {...config.allShops.queryParameters, CategoryIds: id}});
  });
  
  $('.n-search-wrapper .n-search-input').keydown(function (event) { 
    event.stopImmediatePropagation();
    var id = event.key || event.which || event.keyCode || 0;   
    if (id == "Enter") {
      event.preventDefault();
      $('.n-absolute-elements-search .n-primary-button').trigger('click');
      return false;
    }
  });
  
  $('.w-dropdown-link').click(function () {
    $('.dropdown-sort.w-dropdown-link').removeClass('active');
    $(this).addClass('active');
    if ($(this).text() === "Z-A") {
      $('#w-dropdown-list-1').attr('data-sort-decending', '1');
      createElements(collectShopParameter({ Ascending: false }));
    } else if ($(this).text() === "A-Z") {
      $('#w-dropdown-list-1').attr('data-sort-decending', '0');
      createElements(collectShopParameter({ Ascending: true }));
    } else {
      $('#w-dropdown-list-1').attr('data-sort-decending', '2');
      createElements(collectShopParameter({ SortBy: 'CreatedDate', Ascending: false }));
    }
    $('.n-filters-wrapper-shops .n-filters-dropdown.w-dropdown').trigger('click');
  });
  
  
  $('.n-search-error-wrapper').hide();
  $('.n-subcategories-wrapper-div').hide();
  $('.n-clear-search-link').hide();
  
  
  /**
  * Category clicked -> Show subcatgory list -> restrict Category list height to 100vh and overflow hidden
  */
  $('body').on('click', '.n-category-name', function (e) {
    $(this).children('.sibling .black-week').next().css({
      display: 'block',
      transform: 'translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)',
      'transform-style': 'preserve-3d',
      height: '2300px',
      overflow: 'scroll'
    }).animate({
      scrollTop: 0
    });
    $(this).parent('.sibling.absolute').css({
      display: 'block',
      transform: 'translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)',
      'transform-style': 'preserve-3d',
      overflow: 'scroll'
    }).animate({
      scrollTop: 0
    });
  });
  
  /**
  * Sub Category Back clicked 
  */
  $('body').on('click', '.sibling-2.absolute .n-mm-menu-header', function (e) {
    $(this).parent('.sibling-2.absolute').css({
      display: 'none',
      transform: 'translate3d(100vw, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)',
      'transform-style': 'preserve-3d'
    });
    $(this).closest('.sibling.absolute').css({
      display: 'block',
      transform: 'translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)',
      'transform-style': 'preserve-3d',
      height: '100vh',
      overflow: 'scroll'
    });
    e.stopPropagation();
  });
  
  /**
  * Category Back clicked 
  */
  $('body').on('click', '.sibling.absolute .n-mm-menu-header', function (e) {
    $(this).parent('.sibling.absolute').css({
      display: 'none',
      transform: 'translate3d(100vw, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)',
      'transform-style': 'preserve-3d'
    });
    e.stopPropagation();
  });
  
  $('.menu-button-3.w-nav-button').click(function () {
    $('.sibling.absolute').hide();
  });
  
  $('.n-filters-wrapper.bw .n-gradient-arrow-left .n-categories-arrow-link-block').click(function () {
    var element = document.querySelector('.n-filters-wrapper.bw .n-list-filters-emp-copy');
    element.scrollBy({
      left: -150,
      behavior: 'smooth'
    });
  });
  $('.n-filters-wrapper.bw .n-gradient-arrow-right .n-categories-arrow-link-block').click(function () {
    var element = document.querySelector('.n-filters-wrapper.bw .n-list-filters-emp-copy');
    element.scrollBy({
      left: 150,
      behavior: 'smooth'
    });
  });
  $('.n-filters-wrapper.n-hidden-on-devices .n-gradient-arrow-left .n-categories-arrow-link-block').click(function () {
    var element = document.querySelector('.n-filters-wrapper.n-hidden-on-devices .n-list-filters-emp-copy');
    element.scrollBy({
      left: -150,
      behavior: 'smooth'
    });
  });
  $('.n-filters-wrapper.n-hidden-on-devices .n-gradient-arrow-right .n-categories-arrow-link-block').click(function () {
    var element = document.querySelector('.n-filters-wrapper.n-hidden-on-devices .n-list-filters-emp-copy');
    element.scrollBy({
      left: 150,
      behavior: 'smooth'
    });
  });
  addCountdown('.n-timer-wrapper', '+1', "Nov 26, 2022 00:00:00");
});
      
      
function addCountdown(selector, offset, date) {
  var x = setInterval(function () {
    var d = new Date();
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    var nd = new Date(utc + (3600000 * offset)); 
    var countDownDate = new Date(date).getTime();
    var now = nd.getTime();
    var distance = countDownDate - now;
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);
    $(selector).children('.n-timer-numbers').eq(0).html(days);
    $(selector).children('.n-timer-numbers').eq(1).html(hours);
    $(selector).children('.n-timer-numbers').eq(2).html(minutes);
    $(selector).children('.n-timer-numbers').eq(3).html(seconds);
    if (distance < 0) {
      clearInterval(x);
      $(selector).hide();
    }
  }, 1000);
}