from pathlib import Path
p=Path('src/features/listings/components/ListingComposer.tsx');s=p.read_text()
s=s.replace('  Armchair,','  Armchair,\n  ArrowLeft,\n  ArrowRight,')
s=s.replace("{ href: '#publish', label: 'Publish' }", "{ href: '#publish', label: 'Review' }")
s=s.replace("  const [listingId, setListingId]", "  const [activeStep, setActiveStep] = useState(initial ? 1 : 0);\n  const stepHeadingRef = useRef<HTMLParagraphElement>(null);\n  const [listingId, setListingId]")
s=s.replace("  const persistDraft = useCallback", """  const goToStep = (step: number) => {
    setActiveStep(step);
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus({ preventScroll: true });
      stepHeadingRef.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
  };

  const revealIssue = (field: PropertyKey | undefined) => {
    setActiveStep(['priceCents', 'pickupArea', 'price'].includes(String(field)) ? 2 : 1);
    requestAnimationFrame(() => focusFirstIssue(field));
  };

  const continueStep = () => {
    clearErrors();
    if (activeStep === 0) {
      if (!images.some((image) => image.status === 'uploaded') || hasFailedImages || hasUploadingImages) {
        setNoticeKind('error');
        setNotice(hasUploadingImages ? 'Let your photos finish uploading.' : hasFailedImages ? 'Retry or remove failed photos to continue.' : 'Add at least one photo to continue.');
        return;
      }
    } else if (activeStep < 3) {
      const result = listingPublishSchema.safeParse({ ...toPayload(), listingId: listingIdRef.current ?? '00000000-0000-4000-8000-000000000000' });
      if (!result.success) {
        const fields = activeStep === 1 ? ['title', 'description', 'categoryId', 'condition'] : ['priceCents', 'pickupArea'];
        const issues = result.error.issues.filter((issue) => fields.includes(String(issue.path[0])));
        if (issues.length) {
          applyFieldErrors(Object.fromEntries(issues.map((issue) => [String(issue.path[0]), [issue.message]])), setError);
          setNoticeKind('error');
          setNotice('A few details still need your attention.');
          revealIssue(issues[0].path[0]);
          return;
        }
      }
    }
    setNotice('');
    goToStep(Math.min(activeStep + 1, 3));
  };

  const persistDraft = useCallback""")
s=s.replace('focusFirstIssue(validation.error.issues[0]?.path[0]);','revealIssue(validation.error.issues[0]?.path[0]);')
s=s.replace("document.getElementById('images')?.scrollIntoView({ behavior: 'smooth', block: 'start' });",'goToStep(0);')
s=s.replace('className="relative pb-44 text-um-text-inverse lg:pb-24"','className="um-sell-workspace relative pb-44 text-um-text-inverse lg:pb-24"')
s=s.replace("{isPublished ? 'Keep it current.' : 'Pass it on.'}","{isPublished ? 'Keep your find current.' : <>Your next good deed.<br /><span className=\"font-serif font-normal italic text-um-gold-300\">Pass it on.</span></>}")
s=s.replace('          </h1>\n        </div>\n      </header>', '''          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/50">A few photos, a little detail, and a new home for something good. Your draft stays private until you publish.</p>
        </div>
      </header>''',1)
a=s.index('        <ol className=');b=s.index('      </nav>',a)
s=s[:a]+'''        <ol className="um-sell-steps">
          {STEPS.map((step, index) => (
            <li key={step.href}>
              <button type="button" aria-current={activeStep === index ? 'step' : undefined} onClick={() => goToStep(index)}>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{step.label}
              </button>
            </li>
          ))}
        </ol>
'''+s[b:]
s=s.replace('''          <ImageUploader
            ensureDraft''','''          <div className="um-step-summary">
            <p ref={stepHeadingRef} tabIndex={-1} className="scroll-mt-28 outline-none">Step {activeStep + 1} of 4 <span>— {STEPS[activeStep].label}</span></p>
            <button type="button" onClick={saveDraft} disabled={isSaving} className="inline-flex items-center gap-2 text-xs text-white/65 hover:text-white disabled:opacity-40"><Save size={14} aria-hidden="true" />{isPublished ? 'Save changes' : 'Save draft'}</button>
          </div>
          <div hidden={activeStep !== 0} data-sell-step>
          <ImageUploader
            ensureDraft''')
s=s.replace('''            onImagesChange={setImages}
          />''','''            onImagesChange={setImages}
          />
          <div className="um-photo-tips"><p><strong>Let it shine.</strong> Natural light makes all the difference.</p><p><strong>Show the whole story.</strong> Add a close-up of any wear.</p><p><strong>Best photo first.</strong> Drag your favourite to the front.</p></div>
          </div>''',1)
s=s.replace('''            aria-labelledby="details-heading"''','''            hidden={activeStep !== 1} data-sell-step
            aria-labelledby="details-heading"''',1)
s=s.replace('''            aria-labelledby="pricing-heading"''','''            hidden={activeStep !== 2} data-sell-step
            aria-labelledby="pricing-heading"''',1)
s=s.replace('''          <section className="scroll-mt-32" id="publish">''','''          <section hidden={activeStep !== 3} data-sell-step className="scroll-mt-32" id="publish">''')
s=s.replace('>Ready to list</h2>','>One last look.</h2>')
s=s.replace('''              <p
                aria-live="polite"
                className={cn(
                  'mt-5 min-h-5 text-sm font-medium',''','''              <p className="mt-3 text-sm leading-relaxed text-white/55">Check the details your Waterloo people will see. You can always come back and make changes.</p>
              <dl className="um-review-details">
                <div><dt>Photos</dt><dd>{images.filter((image) => image.status === 'uploaded').length} ready <button type="button" onClick={() => goToStep(0)}>Edit</button></dd></div>
                <div><dt>Item</dt><dd>{values.title || 'Add a title'} <button type="button" onClick={() => goToStep(1)}>Edit</button></dd></div>
                <div><dt>Category · condition</dt><dd>{selectedCategory?.name ?? 'Choose a category'} · {selectedCondition?.label ?? 'Choose condition'}</dd></div>
                <div><dt>Price</dt><dd>{displayPrice === null ? 'Add a price' : displayPrice === 0 ? 'Free' : `$${(displayPrice / 100).toFixed(2)} CAD`}{values.openToOffers ? ' · Open to offers' : ''} <button type="button" onClick={() => goToStep(2)}>Edit</button></dd></div>
                <div><dt>Pickup</dt><dd>{values.pickupArea || 'Add a pickup address'}</dd></div>
              </dl>
              <p
                aria-live="polite"
                className={cn(
                  'mt-5 min-h-5 text-sm font-medium',''',1)
s=s.replace('''        </form>

        <aside''','''          <div className="um-step-footer">
            <button type="button" onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0} className="inline-flex min-h-11 items-center gap-2 text-sm text-white/65 disabled:invisible"><ArrowLeft size={16} aria-hidden="true" /> Back</button>
            {activeStep < 3 && <Button type="button" onClick={continueStep} variant="gold" className="rounded-full px-6">{activeStep === 2 ? 'Review listing' : 'Continue'}<ArrowRight size={16} aria-hidden="true" /></Button>}
          </div>
        </form>

        <aside''',1)
# Mobile primary action: Continue through steps, publish only on review.
pos=s.index('className="h-11 flex-1 bg-um-gold-500')
start=s[:pos];tail=s[pos:];tail=tail.replace('onClick={publish}', 'onClick={activeStep < 3 ? continueStep : publish}',1).replace("{hasUploadingImages\n                ? 'Uploading photos'", "{activeStep < 3 ? (activeStep === 2 ? 'Review listing' : 'Continue') : hasUploadingImages\n                ? 'Uploading photos'",1);s=start+tail
# Preserve form focus when step validation exposes a field.
s=s.replace("scrollTarget?.scrollIntoView({", "scrollTarget?.scrollIntoView?.({")
p.write_text(s)
