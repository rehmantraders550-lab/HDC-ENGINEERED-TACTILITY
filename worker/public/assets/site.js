(() => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#main-nav');
  if (toggle && nav) toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('is-open', !expanded);
  });
})();
const productSelect = document.querySelector('select[name="product_id"]');
if (productSelect) {
  const group = document.querySelector('.commercial-fields');
  const colors = document.querySelector('.color-field');
  const sheet = document.querySelector('.sheet-field');
  const size = document.querySelector('.size-field');
  const surface = document.querySelector('.surface-fields');
  const quantity = group?.querySelector('[name="configuration[quantity]"]');
  const note = document.querySelector('.commercial-note');
  const updateFields = () => {
    const option = productSelect.selectedOptions[0];
    const slug = option?.dataset.slug || '';
    const isCataloguePoster = ['catalogues', 'posters'].includes(slug);
    const isSheet = ['labels-stickers', 'custom-sticker-sheets'].includes(slug);
    const isSurfaceReview = option?.dataset.template === 'B';
    const hasProduct = Boolean(slug);
    if (group) group.hidden = !hasProduct;
    if (quantity) quantity.required = hasProduct;
    if (colors) {
      colors.hidden = !isCataloguePoster;
      const colSelect = colors.querySelector('select');
      if (colSelect) colSelect.required = isCataloguePoster;
    }
    if (sheet) sheet.hidden = !isSheet;
    if (size) size.hidden = isCataloguePoster || isSheet || !hasProduct;
    if (surface) surface.hidden = !isSurfaceReview;
    if (note) {
      note.textContent = isCataloguePoster
        ? 'Minimum 500 pieces. Print colors: 1, 2 or 4. Final price requires an HDC approved quote.'
        : isSheet ? 'An A3 sticker or label sheet has a PKR 2,500 base price. This is not a calculated job total; other specifications require a quote.'
        : isSurfaceReview ? 'Surface compatibility is reviewed for the actual object and application.' : '';
    }
  };
  productSelect.addEventListener('change', updateFields);
  updateFields();
}
