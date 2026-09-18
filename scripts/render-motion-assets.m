#import <AppKit/AppKit.h>
#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <ImageIO/ImageIO.h>

// Author in a compact 720 × 900 logical coordinate system, then render the
// final films at 1.5×. This keeps every layout measurement readable while
// supplying enough native pixels for the cards on a 2× laptop/desktop display.
static const NSInteger kWidth = 720;
static const NSInteger kHeight = 900;
static const CGFloat kOutputScale = 1.5;
static const NSInteger kFPS = 60;
static const CGFloat kDuration = 12.0;

typedef NS_ENUM(NSInteger, UMMotionScene) {
  UMMotionSceneAccess = 0,
  UMMotionSceneBrowse = 1,
  UMMotionSceneNetwork = 2,
};

typedef struct {
  __unsafe_unretained NSImage *logo;
  __unsafe_unretained NSImage *badge;
  __unsafe_unretained NSImage *electronics;
  __unsafe_unretained NSImage *books;
  __unsafe_unretained NSImage *household;
  __unsafe_unretained NSImage *clothing;
} UMAssets;

static CGFloat Clamp(CGFloat value, CGFloat lower, CGFloat upper) {
  return MIN(MAX(value, lower), upper);
}

static CGFloat Phase(CGFloat time, CGFloat start, CGFloat end) {
  return Clamp((time - start) / (end - start), 0, 1);
}

static CGFloat EaseOut(CGFloat value) {
  CGFloat inverse = 1 - Clamp(value, 0, 1);
  return 1 - inverse * inverse * inverse;
}

static CGFloat EaseIn(CGFloat value) {
  value = Clamp(value, 0, 1);
  return value * value * value;
}

static CGFloat EaseInOut(CGFloat value) {
  value = Clamp(value, 0, 1);
  return value < 0.5 ? 4 * value * value * value
                     : 1 - pow(-2 * value + 2, 3) / 2;
}

static CGFloat Mix(CGFloat from, CGFloat to, CGFloat progress) {
  return from + (to - from) * progress;
}

static NSColor *RGB(CGFloat red, CGFloat green, CGFloat blue, CGFloat alpha) {
  return [NSColor colorWithSRGBRed:red / 255.0
                             green:green / 255.0
                              blue:blue / 255.0
                             alpha:alpha];
}

static NSRect TopRect(CGFloat x, CGFloat y, CGFloat width, CGFloat height) {
  return NSMakeRect(x, kHeight - y - height, width, height);
}

static NSPoint TopPoint(CGFloat x, CGFloat y) {
  return NSMakePoint(x, kHeight - y);
}

static NSFont *DisplayFont(CGFloat size, NSFontWeight weight) {
  NSFont *font = [NSFont fontWithName:@"Helvetica Neue" size:size];
  if (!font)
    font = [NSFont systemFontOfSize:size weight:weight];
  return font;
}

static NSFont *EditorialFont(CGFloat size) {
  NSFont *font = [NSFont fontWithName:@"Iowan Old Style Italic" size:size];
  if (!font)
    font = [NSFont fontWithName:@"Georgia Italic" size:size];
  return font ?: [NSFont systemFontOfSize:size weight:NSFontWeightRegular];
}

static NSBezierPath *RoundedPath(NSRect rect, CGFloat radius) {
  return [NSBezierPath bezierPathWithRoundedRect:rect
                                         xRadius:radius
                                         yRadius:radius];
}

static void SetShadow(NSColor *color, CGFloat blur, CGFloat x, CGFloat y) {
  NSShadow *shadow = [[NSShadow alloc] init];
  shadow.shadowColor = color;
  shadow.shadowBlurRadius = blur;
  shadow.shadowOffset = NSMakeSize(x, y);
  [shadow set];
}

static void ClearShadow(void) {
  NSShadow *shadow = [[NSShadow alloc] init];
  shadow.shadowColor = [NSColor clearColor];
  shadow.shadowBlurRadius = 0;
  shadow.shadowOffset = NSZeroSize;
  [shadow set];
}

static void DrawText(NSString *text, NSRect topRect, CGFloat size,
                     NSFontWeight weight, NSColor *color, CGFloat tracking,
                     NSTextAlignment alignment, BOOL editorial) {
  NSMutableParagraphStyle *paragraph = [[NSMutableParagraphStyle alloc] init];
  paragraph.alignment = alignment;
  paragraph.lineBreakMode = NSLineBreakByTruncatingTail;
  NSDictionary *attributes = @{
    NSFontAttributeName : editorial ? EditorialFont(size)
                                    : DisplayFont(size, weight),
    NSForegroundColorAttributeName : color,
    NSKernAttributeName : @(tracking),
    NSParagraphStyleAttributeName : paragraph,
  };
  [text drawInRect:topRect withAttributes:attributes];
}

static void DrawRadialGlow(CGFloat topX, CGFloat topY, CGFloat radius,
                           NSColor *color, CGFloat alpha) {
  NSPoint center = TopPoint(topX, topY);
  NSGradient *gradient = [[NSGradient alloc]
      initWithStartingColor:[color colorWithAlphaComponent:alpha]
                endingColor:[color colorWithAlphaComponent:0]];
  [gradient drawFromCenter:center
                    radius:0
                  toCenter:center
                    radius:radius
                   options:NSGradientDrawsBeforeStartingLocation |
                           NSGradientDrawsAfterEndingLocation];
}

static void DrawBackground(CGFloat time, CGFloat goldBias, CGFloat blueBias) {
  NSGradient *base = [[NSGradient alloc]
      initWithColors:@[ RGB(4, 7, 11, 1), RGB(8, 14, 20, 1), RGB(3, 6, 9, 1) ]
         atLocations:(const CGFloat[]){0, 0.54, 1}
          colorSpace:[NSColorSpace sRGBColorSpace]];
  [base drawInRect:NSMakeRect(0, 0, kWidth, kHeight) angle:-62];

  CGFloat drift = sin(time * M_PI * 2) * 18;
  DrawRadialGlow(140 + drift, 170, 360, RGB(226, 176, 45, 1), 0.13 * goldBias);
  DrawRadialGlow(660 - drift * 0.4, 720, 420, RGB(39, 85, 151, 1),
                 0.17 * blueBias);

  NSBezierPath *beam = [NSBezierPath bezierPath];
  [beam moveToPoint:TopPoint(-80, 40)];
  [beam lineToPoint:TopPoint(330, -20)];
  [beam lineToPoint:TopPoint(590, 900)];
  [beam lineToPoint:TopPoint(330, 900)];
  [beam closePath];
  [RGB(244, 219, 136, 0.018) setFill];
  [beam fill];

  uint32_t seed = 0x9e3779b9;
  for (NSInteger index = 0; index < 220; index++) {
    seed = seed * 1664525u + 1013904223u;
    CGFloat x = (seed % 72000) / 100.0;
    seed = seed * 1664525u + 1013904223u;
    CGFloat y = (seed % 90000) / 100.0;
    CGFloat alpha = 0.012 + (seed % 6) / 1000.0;
    [RGB(255, 255, 255, alpha) setFill];
    NSRectFill(TopRect(x, y, 1, 1));
  }
}

static void DrawVignette(CGFloat opacity) {
  // Oversized radial falloffs avoid the hard horizontal seams produced by
  // stacking rectangular edge gradients.
  DrawRadialGlow(360, -130, 660, RGB(0, 0, 0, 1), 0.36 * opacity);
  DrawRadialGlow(360, 1030, 700, RGB(0, 0, 0, 1), 0.48 * opacity);
  DrawRadialGlow(-110, 450, 520, RGB(0, 0, 0, 1), 0.34 * opacity);
  DrawRadialGlow(830, 450, 520, RGB(0, 0, 0, 1), 0.34 * opacity);
}

static void DrawMetalPlate(NSRect topRect, CGFloat radius, CGFloat depth,
                           NSColor *topColor, NSColor *bottomColor,
                           CGFloat alpha) {
  // AppKit's gradient renderer does not composite very-low-alpha endpoint
  // colors reliably into this bitmap context. Near the end of a fade it can
  // un-premultiply those colors toward white, producing a bright plate-shaped
  // flash before the object disappears. Keep the gradient itself opaque and
  // fade the finished plate through the graphics context instead.
  NSColor *opaqueTop = [topColor colorWithAlphaComponent:1];
  NSColor *opaqueBottom = [bottomColor colorWithAlphaComponent:1];

  [NSGraphicsContext saveGraphicsState];
  CGContextSetAlpha([NSGraphicsContext currentContext].CGContext,
                    Clamp(alpha, 0, 1));

  NSRect rect = topRect;
  NSRect edgeRect = NSOffsetRect(rect, depth, -depth);
  NSBezierPath *edge = RoundedPath(edgeRect, radius);
  SetShadow(RGB(0, 0, 0, 0.62), 36, 0, -24);
  [RGB(2, 5, 7, 1) setFill];
  [edge fill];
  ClearShadow();

  NSBezierPath *body = RoundedPath(rect, radius);
  [NSGraphicsContext saveGraphicsState];
  [body addClip];
  NSGradient *gradient =
      [[NSGradient alloc] initWithStartingColor:opaqueTop
                                    endingColor:opaqueBottom];
  [gradient drawInRect:rect angle:-64];

  NSGradient *key =
      [[NSGradient alloc] initWithStartingColor:RGB(255, 255, 255, 0.13)
                                    endingColor:RGB(255, 255, 255, 0)];
  [key drawInRect:NSMakeRect(NSMinX(rect), NSMaxY(rect) - 3, NSWidth(rect), 3)
            angle:90];
  [NSGraphicsContext restoreGraphicsState];

  [RGB(230, 221, 193, 0.18) setStroke];
  body.lineWidth = 1.2;
  [body stroke];
  [NSGraphicsContext restoreGraphicsState];
}

static void DrawImageCover(NSImage *image, NSRect topRect, CGFloat radius,
                           CGFloat alpha) {
  if (!image)
    return;
  NSRect rect = topRect;
  NSBezierPath *clip = RoundedPath(rect, radius);
  [NSGraphicsContext saveGraphicsState];
  [clip addClip];

  NSSize sourceSize = image.size;
  CGFloat sourceAspect = sourceSize.width / MAX(sourceSize.height, 1);
  CGFloat targetAspect = rect.size.width / MAX(rect.size.height, 1);
  NSRect source = NSMakeRect(0, 0, sourceSize.width, sourceSize.height);
  if (sourceAspect > targetAspect) {
    CGFloat cropWidth = sourceSize.height * targetAspect;
    source.origin.x = (sourceSize.width - cropWidth) / 2;
    source.size.width = cropWidth;
  } else {
    CGFloat cropHeight = sourceSize.width / targetAspect;
    source.origin.y = (sourceSize.height - cropHeight) / 2;
    source.size.height = cropHeight;
  }

  [image drawInRect:rect
            fromRect:source
           operation:NSCompositingOperationSourceOver
            fraction:alpha
      respectFlipped:NO
               hints:@{
                 NSImageHintInterpolation : @(NSImageInterpolationHigh)
               }];
  [NSGraphicsContext restoreGraphicsState];
}

static void DrawLogo(NSImage *logo, NSRect topRect, CGFloat alpha) {
  if (!logo)
    return;
  [logo drawInRect:topRect
            fromRect:NSZeroRect
           operation:NSCompositingOperationSourceOver
            fraction:alpha
      respectFlipped:NO
               hints:@{
                 NSImageHintInterpolation : @(NSImageInterpolationHigh)
               }];
}

static void ApplyObjectTransform(NSPoint topCenter, CGFloat rotation,
                                 CGFloat scaleX, CGFloat scaleY) {
  NSPoint center = TopPoint(topCenter.x, topCenter.y);
  NSAffineTransform *transform = [NSAffineTransform transform];
  [transform translateXBy:center.x yBy:center.y];
  [transform rotateByDegrees:rotation];
  [transform scaleXBy:scaleX yBy:scaleY];
  [transform translateXBy:-center.x yBy:-center.y];
  [transform concat];
}

static void DrawCursor(CGFloat topX, CGFloat topY, CGFloat scale,
                       CGFloat alpha) {
  [NSGraphicsContext saveGraphicsState];
  ApplyObjectTransform(NSMakePoint(topX, topY), -1.5, scale, scale);
  NSBezierPath *cursor = [NSBezierPath bezierPath];
  [cursor moveToPoint:TopPoint(topX, topY)];
  [cursor lineToPoint:TopPoint(topX + 1.2, topY + 31.5)];
  [cursor lineToPoint:TopPoint(topX + 9.1, topY + 23.2)];
  [cursor lineToPoint:TopPoint(topX + 15.4, topY + 36.4)];
  [cursor lineToPoint:TopPoint(topX + 21.2, topY + 33.5)];
  [cursor lineToPoint:TopPoint(topX + 14.8, topY + 20.9)];
  [cursor lineToPoint:TopPoint(topX + 26.4, topY + 20.4)];
  [cursor closePath];
  cursor.lineJoinStyle = NSLineJoinStyleRound;
  cursor.lineCapStyle = NSLineCapStyleRound;
  SetShadow(RGB(0, 0, 0, 0.82 * alpha), 11, 0, -6);
  [RGB(250, 249, 245, alpha) setFill];
  [cursor fill];
  ClearShadow();
  [RGB(4, 7, 10, 0.96 * alpha) setStroke];
  cursor.lineWidth = 3.6;
  [cursor stroke];
  [NSGraphicsContext restoreGraphicsState];
}

static void DrawRoundedBorderProgress(NSRect topRect, CGFloat radius,
                                      CGFloat progress, NSColor *color,
                                      CGFloat width) {
  NSBezierPath *path = RoundedPath(topRect, radius);
  CGFloat perimeter =
      2 * (topRect.size.width + topRect.size.height) + 2 * M_PI * radius;
  CGFloat dash[] = {MAX(progress * perimeter, 0.1), perimeter};
  [path setLineDash:dash count:2 phase:0];
  path.lineWidth = width;
  path.lineCapStyle = NSLineCapStyleRound;

  [NSGraphicsContext saveGraphicsState];
  SetShadow([color colorWithAlphaComponent:0.46], 12, 0, 0);
  [color setStroke];
  [path stroke];
  [NSGraphicsContext restoreGraphicsState];
}

static void DrawAccessScene(CGFloat time, UMAssets assets) {
  DrawBackground(time, 1.1, 0.85);

  CGFloat reveal = EaseOut(Phase(time, 0.00, 0.13));
  CGFloat fields = EaseInOut(Phase(time, 0.12, 0.30));
  CGFloat click = EaseInOut(Phase(time, 0.31, 0.39));
  CGFloat auth = EaseInOut(Phase(time, 0.39, 0.52));
  CGFloat welcome = EaseInOut(Phase(time, 0.50, 0.63));
  CGFloat outro = EaseInOut(Phase(time, 0.87, 1.00));
  CGFloat sceneAlpha = reveal * (1 - outro);
  if (sceneAlpha <= 0.001) {
    DrawVignette(1);
    return;
  }

  CGFloat cameraScale = Mix(0.9, 1.0, reveal);
  CGFloat cameraRotation = Mix(-4.5, -0.8, reveal) + sin(time * M_PI) * 0.25;
  CGFloat panelY = Mix(226, 172, reveal);
  NSRect panelRect = TopRect(92, panelY, 536, 520);

  [NSGraphicsContext saveGraphicsState];
  ApplyObjectTransform(NSMakePoint(360, panelY + 260), cameraRotation,
                       cameraScale, cameraScale * 0.985);

  DrawRadialGlow(360, panelY + 250, 300, RGB(232, 190, 66, 1),
                 0.08 * sceneAlpha);
  DrawMetalPlate(panelRect, 34, 9, RGB(31, 42, 47, sceneAlpha),
                 RGB(6, 11, 15, sceneAlpha), sceneAlpha);

  CGFloat authAlpha = sceneAlpha * (1 - welcome);
  if (authAlpha > 0.001) {
    DrawLogo(assets.logo, TopRect(126, panelY + 40, 42, 42), authAlpha);
    DrawText(@"TROVUN", TopRect(184, panelY + 44, 260, 30), 17,
             NSFontWeightBold, RGB(239, 235, 224, 0.92 * authAlpha), 1.1,
             NSTextAlignmentLeft, NO);
    DrawText(@"STUDENT ACCESS", TopRect(126, panelY + 112, 300, 24), 12,
             NSFontWeightSemibold, RGB(242, 213, 111, 0.72 * authAlpha), 3.4,
             NSTextAlignmentLeft, NO);

    CGFloat emailX = Mix(154, 126, fields);
    CGFloat passwordX = Mix(98, 126, fields);
    CGFloat fieldAlpha = 0.36 + fields * 0.64;
    NSRect emailRect = TopRect(emailX, panelY + 164, 468, 74);
    NSRect passwordRect = TopRect(passwordX, panelY + 254, 468, 74);

    DrawMetalPlate(emailRect, 15, 4, RGB(27, 36, 41, fieldAlpha * authAlpha),
                   RGB(9, 14, 18, fieldAlpha * authAlpha),
                   fieldAlpha * authAlpha);
    DrawText(@"WATERLOO EMAIL", TopRect(emailX + 22, panelY + 180, 220, 18), 9,
             NSFontWeightMedium,
             RGB(255, 255, 255, 0.38 * fieldAlpha * authAlpha), 2.2,
             NSTextAlignmentLeft, NO);
    DrawText(@"alex@uwaterloo.ca", TopRect(emailX + 22, panelY + 201, 320, 28),
             16, NSFontWeightMedium,
             RGB(244, 241, 232, 0.88 * fieldAlpha * authAlpha), 0.1,
             NSTextAlignmentLeft, NO);

    DrawMetalPlate(passwordRect, 15, 4, RGB(27, 36, 41, fieldAlpha * authAlpha),
                   RGB(9, 14, 18, fieldAlpha * authAlpha),
                   fieldAlpha * authAlpha);
    DrawText(@"PASSWORD", TopRect(passwordX + 22, panelY + 270, 220, 18), 9,
             NSFontWeightMedium,
             RGB(255, 255, 255, 0.38 * fieldAlpha * authAlpha), 2.2,
             NSTextAlignmentLeft, NO);
    DrawText(@"••••••••••••", TopRect(passwordX + 22, panelY + 291, 320, 28),
             17, NSFontWeightMedium,
             RGB(244, 241, 232, 0.88 * fieldAlpha * authAlpha), 2.8,
             NSTextAlignmentLeft, NO);

    CGFloat depression = sin(click * M_PI) * 2;
    NSRect buttonRect =
        TopRect(126, panelY + 370 + depression, 468, 72 - depression);
    NSBezierPath *button = RoundedPath(buttonRect, 16);
    NSGradient *buttonGradient =
        [[NSGradient alloc] initWithStartingColor:RGB(248, 220, 119, authAlpha)
                                      endingColor:RGB(211, 162, 37, authAlpha)];
    SetShadow(RGB(231, 188, 53, 0.14 * authAlpha), 22, 0, -10);
    [buttonGradient drawInBezierPath:button angle:-70];
    ClearShadow();
    [RGB(255, 246, 203, 0.5 * authAlpha) setStroke];
    button.lineWidth = 1;
    [button stroke];
    DrawText(@"SIGN IN", TopRect(126, panelY + 394 + depression, 468, 30), 15,
             NSFontWeightBold, RGB(7, 11, 14, 0.94 * authAlpha), 1.8,
             NSTextAlignmentCenter, NO);

    if (auth > 0) {
      DrawRoundedBorderProgress(panelRect, 34, auth,
                                RGB(248, 220, 119, 0.92 * authAlpha), 2.2);
    }
  }

  if (welcome > 0) {
    CGFloat alpha = welcome * sceneAlpha;
    DrawLogo(assets.logo, TopRect(126, panelY + 44, 52, 52), alpha);
    DrawText(@"WATERLOO / VERIFIED", TopRect(202, panelY + 53, 300, 24), 10,
             NSFontWeightSemibold, RGB(242, 213, 111, 0.74 * alpha), 2.8,
             NSTextAlignmentLeft, NO);
    DrawText(@"Welcome back.", TopRect(126, panelY + 155, 460, 72), 50,
             NSFontWeightBold, RGB(241, 238, 229, 0.96 * alpha), -1.6,
             NSTextAlignmentLeft, NO);
    DrawText(@"Alex", TopRect(126, panelY + 218, 460, 98), 76,
             NSFontWeightRegular, RGB(242, 213, 111, alpha), -1.2,
             NSTextAlignmentLeft, YES);

    [RGB(255, 255, 255, 0.12 * alpha) setFill];
    NSRectFill(TopRect(126, panelY + 350, 468, 1));
    DrawRadialGlow(154, panelY + 410, 34, RGB(91, 203, 142, 1), 0.2 * alpha);
    [RGB(91, 203, 142, 0.92 * alpha) setFill];
    [[NSBezierPath bezierPathWithOvalInRect:TopRect(144, panelY + 400, 9, 9)]
        fill];
    DrawText(@"MARKET OPEN", TopRect(170, panelY + 393, 280, 24), 11,
             NSFontWeightSemibold, RGB(236, 233, 224, 0.55 * alpha), 2.3,
             NSTextAlignmentLeft, NO);
  }

  [NSGraphicsContext restoreGraphicsState];

  if (time > 0.22 && time < 0.5) {
    CGFloat travel = EaseInOut(Phase(time, 0.24, 0.35));
    CGFloat cursorX = Mix(590, 525, travel);
    CGFloat cursorY = Mix(panelY + 500, panelY + 408, travel);
    CGFloat cursorScale = 0.92 - sin(click * M_PI) * 0.055;
    DrawCursor(cursorX, cursorY, cursorScale,
               (1 - Phase(time, 0.43, 0.49)) * sceneAlpha);
  }

  DrawVignette(1);
}

static NSArray<NSImage *> *ListingImages(UMAssets assets) {
  return @[
    assets.electronics,
    assets.books,
    assets.household,
    assets.clothing,
    assets.electronics,
    assets.household,
  ];
}

static NSArray<NSString *> *ListingTitles(void) {
  return @[
    @"27” Monitor", @"MATH 239", @"City bike", @"Warriors crew", @"Desk lamp",
    @"Move-in box"
  ];
}

static NSArray<NSString *> *ListingPrices(void) {
  return @[ @"$145", @"$38", @"$210", @"$32", @"$26", @"$12" ];
}

static void DrawListingTile(NSRect topRect, NSImage *image, NSString *title,
                            NSString *price, CGFloat alpha, CGFloat lift) {
  NSRect rect = NSOffsetRect(topRect, 0, lift);
  if (lift > 0) {
    SetShadow(RGB(0, 0, 0, 0.72 * alpha), 30 + lift * 0.8, 0, -18);
  }
  DrawMetalPlate(rect, 16, 4 + lift * 0.06, RGB(27, 36, 41, alpha),
                 RGB(10, 15, 19, alpha), alpha);
  ClearShadow();

  NSRect imageRect =
      NSMakeRect(NSMinX(rect) + 9, NSMaxY(rect) - 112, NSWidth(rect) - 18, 102);
  DrawImageCover(image, imageRect, 11, alpha);
  NSGradient *shade =
      [[NSGradient alloc] initWithStartingColor:RGB(0, 0, 0, 0)
                                    endingColor:RGB(2, 5, 8, 0.36 * alpha)];
  [shade drawInRect:imageRect angle:90];
  DrawText(
      title,
      NSMakeRect(NSMinX(rect) + 13, NSMinY(rect) + 26, NSWidth(rect) - 78, 24),
      12, NSFontWeightSemibold, RGB(238, 234, 224, 0.92 * alpha), -0.1,
      NSTextAlignmentLeft, NO);
  DrawText(price, NSMakeRect(NSMaxX(rect) - 72, NSMinY(rect) + 26, 56, 24), 11,
           NSFontWeightBold, RGB(242, 213, 111, alpha), 0, NSTextAlignmentRight,
           NO);
  DrawText(
      @"Waterloo · today",
      NSMakeRect(NSMinX(rect) + 13, NSMinY(rect) + 9, NSWidth(rect) - 26, 17),
      8, NSFontWeightRegular, RGB(255, 255, 255, 0.34 * alpha), 0.3,
      NSTextAlignmentLeft, NO);
}

static void DrawBrowseScene(CGFloat time, UMAssets assets) {
  DrawBackground(time, 0.76, 1.22);

  CGFloat intro = EaseOut(Phase(time, 0.00, 0.14));
  CGFloat focus = EaseInOut(Phase(time, 0.16, 0.28));
  CGFloat scroll = EaseInOut(Phase(time, 0.31, 0.49));
  CGFloat lift =
      EaseOut(Phase(time, 0.53, 0.65)) * (1 - EaseIn(Phase(time, 0.82, 0.89)));
  CGFloat reveal = intro;
  if (reveal <= 0.001) {
    DrawVignette(1);
    return;
  }

  // The star field is the permanent plate for this scene. Fade only the
  // interface composite so the end of the loop never collapses to black.
  CGFloat interfaceOpacity = 1 - EaseInOut(Phase(time, 0.82, 0.965));
  CGContextRef interfaceContext = [NSGraphicsContext currentContext].CGContext;
  CGContextSaveGState(interfaceContext);
  CGContextSetAlpha(interfaceContext, interfaceOpacity);
  CGContextBeginTransparencyLayer(interfaceContext, NULL);

  CGFloat deviceScale = Mix(0.89, 1.0, intro);
  CGFloat deviceRotation = Mix(5.4, -1.1, intro) + sin(time * M_PI) * 0.18;
  CGFloat deviceY = Mix(208, 102, intro);
  NSRect deviceRect = TopRect(70, deviceY, 580, 700);

  [NSGraphicsContext saveGraphicsState];
  ApplyObjectTransform(NSMakePoint(360, deviceY + 350), deviceRotation,
                       deviceScale, deviceScale * 0.965);
  DrawRadialGlow(390, deviceY + 380, 350, RGB(45, 98, 164, 1), 0.12 * reveal);
  DrawMetalPlate(deviceRect, 38, 13, RGB(33, 44, 50, reveal),
                 RGB(5, 10, 14, reveal), reveal);

  NSRect screen = TopRect(91, deviceY + 22, 538, 656);
  NSBezierPath *screenClip = RoundedPath(screen, 28);
  [NSGraphicsContext saveGraphicsState];
  [screenClip addClip];
  [RGB(7, 12, 16, reveal) setFill];
  NSRectFill(screen);

  DrawLogo(assets.logo, TopRect(116, deviceY + 48, 30, 30), reveal);
  DrawText(@"TROVUN MARKET", TopRect(160, deviceY + 52, 240, 24), 12,
           NSFontWeightBold, RGB(238, 234, 224, 0.9 * reveal), 1.1,
           NSTextAlignmentLeft, NO);

  NSRect searchRect = TopRect(116, deviceY + 104, 488, 62);
  NSBezierPath *searchPath = RoundedPath(searchRect, 14);
  [RGB(2, 6, 9, 0.92 * reveal) setFill];
  [searchPath fill];
  [RGB(242, 213, 111, (0.12 + focus * 0.38) * reveal) setStroke];
  searchPath.lineWidth = 1.2;
  [searchPath stroke];

  NSBezierPath *lens = [NSBezierPath
      bezierPathWithOvalInRect:TopRect(140, deviceY + 124, 17, 17)];
  [RGB(242, 213, 111, 0.8 * reveal) setStroke];
  lens.lineWidth = 1.8;
  [lens stroke];
  NSBezierPath *handle = [NSBezierPath bezierPath];
  [handle moveToPoint:TopPoint(154, deviceY + 139)];
  [handle lineToPoint:TopPoint(162, deviceY + 147)];
  handle.lineWidth = 1.8;
  [handle stroke];

  NSString *query = @"desk setup";
  NSInteger queryLength =
      (NSInteger)floor(query.length * EaseOut(Phase(time, 0.20, 0.31)));
  NSString *visibleQuery =
      queryLength > 0 ? [query substringToIndex:MIN(queryLength, query.length)]
                      : @"";
  NSString *searchText = queryLength > 0 ? visibleQuery : @"Search Waterloo";
  NSColor *searchColor = queryLength > 0 ? RGB(238, 235, 226, 0.86 * reveal)
                                         : RGB(255, 255, 255, 0.28 * reveal);
  DrawText(searchText, TopRect(177, deviceY + 124, 320, 28), 14,
           NSFontWeightMedium, searchColor, 0, NSTextAlignmentLeft, NO);
  if (time > 0.18 && time < 0.38 && fmod(time * 18, 2) < 1) {
    CGFloat caretX = 181 + MAX(queryLength, 1) * 8.1;
    [RGB(242, 213, 111, 0.9 * reveal) setFill];
    NSRectFill(TopRect(caretX, deviceY + 124, 1.5, 22));
  }

  NSArray<NSString *> *chips = @[ @"For you", @"Electronics", @"Books" ];
  CGFloat chipX = 116;
  for (NSInteger index = 0; index < chips.count; index++) {
    CGFloat width = index == 1 ? 96 : 76;
    NSRect chipRect = TopRect(chipX, deviceY + 184, width, 34);
    NSBezierPath *chip = RoundedPath(chipRect, 17);
    BOOL active = index == (focus > 0.62 ? 1 : 0);
    NSColor *chipColor = active ? RGB(242, 213, 111, reveal)
                                : RGB(255, 255, 255, 0.035 * reveal);
    [chipColor setFill];
    [chip fill];
    DrawText(chips[index], TopRect(chipX, deviceY + 194, width, 19), 8.5,
             NSFontWeightSemibold,
             active ? RGB(7, 11, 14, 0.94 * reveal)
                    : RGB(255, 255, 255, 0.45 * reveal),
             0.2, NSTextAlignmentCenter, NO);
    chipX += width + 10;
  }

  NSArray<NSImage *> *images = ListingImages(assets);
  NSArray<NSString *> *titles = ListingTitles();
  NSArray<NSString *> *prices = ListingPrices();
  [NSGraphicsContext saveGraphicsState];
  NSRect gridViewport = TopRect(104, deviceY + 226, 512, 432);
  [RoundedPath(gridViewport, 8) addClip];
  CGFloat gridY = deviceY + 240 - scroll * 116;
  CGFloat tileWidth = 230;
  CGFloat tileHeight = 178;
  CGFloat gapX = 18;
  CGFloat gapY = 18;
  NSInteger selected = 2;
  for (NSInteger index = 0; index < 6; index++) {
    if (index == selected)
      continue;
    NSInteger column = index % 2;
    NSInteger row = index / 2;
    NSRect tile =
        TopRect(116 + column * (tileWidth + gapX),
                gridY + row * (tileHeight + gapY), tileWidth, tileHeight);
    DrawListingTile(tile, images[index], titles[index], prices[index], reveal,
                    0);
  }

  NSInteger selectedColumn = selected % 2;
  NSInteger selectedRow = selected / 2;
  NSRect selectedTile =
      TopRect(116 + selectedColumn * (tileWidth + gapX),
              gridY + selectedRow * (tileHeight + gapY), tileWidth, tileHeight);
  [NSGraphicsContext saveGraphicsState];
  NSPoint selectedCenter =
      NSMakePoint(NSMidX(selectedTile), kHeight - NSMidY(selectedTile));
  ApplyObjectTransform(selectedCenter, -lift * 0.8, 1 + lift * 0.045,
                       1 + lift * 0.045);
  DrawListingTile(selectedTile, images[selected], titles[selected],
                  prices[selected], reveal, lift * 15);
  [NSGraphicsContext restoreGraphicsState];

  [NSGraphicsContext restoreGraphicsState];
  [NSGraphicsContext restoreGraphicsState];
  [NSGraphicsContext restoreGraphicsState];

  if (time > 0.14 && time < 0.78) {
    CGFloat searchTravel = EaseInOut(Phase(time, 0.14, 0.23));
    CGFloat itemTravel = EaseInOut(Phase(time, 0.39, 0.54));
    CGFloat cursorX = Mix(640, 420, searchTravel);
    CGFloat cursorY = Mix(deviceY + 250, deviceY + 135, searchTravel);
    cursorX = Mix(cursorX, 218, itemTravel);
    cursorY = Mix(cursorY, deviceY + 374 - scroll * 116, itemTravel);
    DrawCursor(cursorX, cursorY,
               0.9 + sin(Phase(time, 0.52, 0.58) * M_PI) * -0.05,
               reveal * (1 - Phase(time, 0.70, 0.78)));
  }

  CGContextEndTransparencyLayer(interfaceContext);
  CGContextRestoreGState(interfaceContext);
  DrawVignette(1);
}

static NSBezierPath *FiberPath(NSPoint startTop, NSPoint control1Top,
                               NSPoint control2Top, NSPoint endTop) {
  NSBezierPath *path = [NSBezierPath bezierPath];
  [path moveToPoint:TopPoint(startTop.x, startTop.y)];
  [path curveToPoint:TopPoint(endTop.x, endTop.y)
       controlPoint1:TopPoint(control1Top.x, control1Top.y)
       controlPoint2:TopPoint(control2Top.x, control2Top.y)];
  path.lineCapStyle = NSLineCapStyleRound;
  return path;
}

static NSPoint CubicPoint(NSPoint p0, NSPoint p1, NSPoint p2, NSPoint p3,
                          CGFloat t) {
  CGFloat inverse = 1 - t;
  CGFloat x = inverse * inverse * inverse * p0.x +
              3 * inverse * inverse * t * p1.x + 3 * inverse * t * t * p2.x +
              t * t * t * p3.x;
  CGFloat y = inverse * inverse * inverse * p0.y +
              3 * inverse * inverse * t * p1.y + 3 * inverse * t * t * p2.y +
              t * t * t * p3.y;
  return NSMakePoint(x, y);
}

static void DrawFiber(NSPoint start, NSPoint control1, NSPoint control2,
                      NSPoint end, CGFloat progress, CGFloat alpha) {
  NSBezierPath *path = FiberPath(start, control1, control2, end);
  CGFloat estimatedLength = hypot(end.x - start.x, end.y - start.y) * 1.45;
  CGFloat dash[] = {MAX(progress * estimatedLength, 0.1),
                    estimatedLength * 1.4};
  [path setLineDash:dash count:2 phase:0];

  [NSGraphicsContext saveGraphicsState];
  [RGB(242, 213, 111, 0.05 * alpha) setStroke];
  path.lineWidth = 10;
  SetShadow(RGB(242, 213, 111, 0.15 * alpha), 18, 0, 0);
  [path stroke];
  ClearShadow();

  [RGB(231, 188, 53, 0.32 * alpha) setStroke];
  path.lineWidth = 3.5;
  [path stroke];

  [RGB(255, 241, 178, 0.82 * alpha) setStroke];
  path.lineWidth = 1.1;
  [path stroke];
  [NSGraphicsContext restoreGraphicsState];
}

static void DrawPhoton(NSPoint start, NSPoint control1, NSPoint control2,
                       NSPoint end, CGFloat position, CGFloat alpha) {
  NSPoint point = CubicPoint(start, control1, control2, end, position);
  DrawRadialGlow(point.x, point.y, 24, RGB(255, 235, 143, 1), 0.35 * alpha);
  [RGB(255, 247, 211, 0.96 * alpha) setFill];
  [[NSBezierPath bezierPathWithOvalInRect:TopRect(point.x - 2.5, point.y - 2.5,
                                                  5, 5)] fill];
}

static void DrawPhotoNode(NSPoint centerTop, NSImage *image, CGFloat size,
                          CGFloat alpha) {
  NSRect rect =
      TopRect(centerTop.x - size / 2, centerTop.y - size / 2, size, size);
  DrawMetalPlate(rect, size * 0.23, 5, RGB(26, 35, 39, alpha),
                 RGB(5, 10, 13, alpha), alpha);
  DrawImageCover(image, NSInsetRect(rect, 6, 6), size * 0.17, alpha);
}

static void DrawPersonNode(NSPoint centerTop, NSString *initial, CGFloat size,
                           CGFloat alpha) {
  NSRect rect =
      TopRect(centerTop.x - size / 2, centerTop.y - size / 2, size, size);
  NSBezierPath *edge =
      [NSBezierPath bezierPathWithOvalInRect:NSOffsetRect(rect, 4, -5)];
  [RGB(2, 6, 8, alpha) setFill];
  [edge fill];
  NSBezierPath *disc = [NSBezierPath bezierPathWithOvalInRect:rect];
  NSGradient *gradient =
      [[NSGradient alloc] initWithStartingColor:RGB(44, 57, 60, alpha)
                                    endingColor:RGB(8, 14, 17, alpha)];
  SetShadow(RGB(0, 0, 0, 0.54 * alpha), 18, 0, -10);
  [gradient drawInBezierPath:disc angle:-55];
  ClearShadow();
  [RGB(242, 213, 111, 0.28 * alpha) setStroke];
  disc.lineWidth = 1.1;
  [disc stroke];
  DrawText(initial, TopRect(centerTop.x - size / 2, centerTop.y - 12, size, 26),
           17, NSFontWeightMedium, RGB(242, 213, 111, 0.88 * alpha), 0.5,
           NSTextAlignmentCenter, NO);
}

static void DrawNetworkScene(CGFloat time, UMAssets assets) {
  DrawBackground(time, 0.9, 1.0);

  CGFloat tokenReveal = EaseOut(Phase(time, 0.00, 0.17));
  CGFloat pullback = EaseInOut(Phase(time, 0.12, 0.32));
  CGFloat dock = EaseInOut(Phase(time, 0.24, 0.39));
  CGFloat routes = EaseInOut(Phase(time, 0.39, 0.68));
  CGFloat endpoints = EaseOut(Phase(time, 0.52, 0.73));
  CGFloat outro = EaseInOut(Phase(time, 0.87, 1.00));

  CGFloat worldScale = Mix(1.18, 0.92, pullback);
  CGFloat worldY = Mix(82, 0, pullback);
  CGFloat worldRotation = Mix(-1.8, 0.4, pullback);

  [NSGraphicsContext saveGraphicsState];
  ApplyObjectTransform(NSMakePoint(360, 450 + worldY), worldRotation,
                       worldScale, worldScale);

  NSPoint core = NSMakePoint(360, 486 + worldY);
  NSPoint token = NSMakePoint(360, 206 + worldY);

  NSArray<NSValue *> *leftPoints = @[
    [NSValue valueWithPoint:NSMakePoint(126, 354 + worldY)],
    [NSValue valueWithPoint:NSMakePoint(104, 510 + worldY)],
    [NSValue valueWithPoint:NSMakePoint(138, 680 + worldY)],
  ];
  NSArray<NSValue *> *rightPoints = @[
    [NSValue valueWithPoint:NSMakePoint(596, 340 + worldY)],
    [NSValue valueWithPoint:NSMakePoint(624, 500 + worldY)],
    [NSValue valueWithPoint:NSMakePoint(574, 674 + worldY)],
  ];

  CGFloat fiberAlpha = (1 - outro) * tokenReveal;
  DrawFiber(token, NSMakePoint(360, 292 + worldY),
            NSMakePoint(360, 390 + worldY), core, dock, fiberAlpha);

  for (NSInteger index = 0; index < leftPoints.count; index++) {
    NSPoint end = leftPoints[index].pointValue;
    CGFloat stagger = Phase(routes, index * 0.12, 0.64 + index * 0.12);
    DrawFiber(core, NSMakePoint(290, 500 + index * 14 + worldY),
              NSMakePoint(220, end.y - 8), end, stagger, fiberAlpha);
  }
  for (NSInteger index = 0; index < rightPoints.count; index++) {
    NSPoint end = rightPoints[index].pointValue;
    CGFloat stagger = Phase(routes, 0.18 + index * 0.12, 0.82 + index * 0.12);
    DrawFiber(core, NSMakePoint(430, 485 + index * 18 + worldY),
              NSMakePoint(510, end.y - 10), end, stagger, fiberAlpha);
  }

  CGFloat photonWindow = Phase(time, 0.68, 0.82);
  CGFloat photonAlpha =
      sin(Clamp(Phase(time, 0.64, 0.86), 0, 1) * M_PI) * (1 - outro);
  if (photonAlpha > 0.01) {
    NSPoint leftEnd = leftPoints[1].pointValue;
    DrawPhoton(core, NSMakePoint(290, 514 + worldY),
               NSMakePoint(220, leftEnd.y - 8), leftEnd, photonWindow,
               photonAlpha);
    NSPoint rightEnd = rightPoints[0].pointValue;
    DrawPhoton(core, NSMakePoint(430, 485 + worldY),
               NSMakePoint(510, rightEnd.y - 10), rightEnd,
               fmod(photonWindow + 0.34, 1), photonAlpha * 0.84);
  }

  CGFloat coreAlpha = dock * (1 - outro);
  if (coreAlpha > 0.001) {
    DrawRadialGlow(core.x, core.y, 160, RGB(232, 184, 48, 1), 0.17 * coreAlpha);
    NSRect coreRect = TopRect(core.x - 74, core.y - 74, 148, 148);
    DrawMetalPlate(coreRect, 42, 12, RGB(32, 38, 37, coreAlpha),
                   RGB(5, 10, 12, coreAlpha), coreAlpha);
    DrawLogo(assets.logo, TopRect(core.x - 39, core.y - 39, 78, 78), coreAlpha);
    [RGB(242, 213, 111, 0.42 * coreAlpha) setStroke];
    NSBezierPath *coreBorder = RoundedPath(coreRect, 42);
    coreBorder.lineWidth = 1.5;
    [coreBorder stroke];
  }

  CGFloat tokenAlpha = tokenReveal * (1 - outro);
  if (tokenAlpha > 0.001) {
    DrawRadialGlow(token.x, token.y, 150, RGB(243, 218, 130, 1),
                   0.10 * tokenAlpha);
    NSRect tokenRect = TopRect(token.x - 92, token.y - 76, 184, 152);
    DrawMetalPlate(tokenRect, 38, 10, RGB(36, 47, 49, tokenAlpha),
                   RGB(7, 12, 15, tokenAlpha), tokenAlpha);
    DrawImageCover(assets.badge, TopRect(token.x - 35, token.y - 52, 70, 70),
                   35, tokenAlpha);
    DrawText(@"UW ID", TopRect(token.x - 80, token.y + 30, 160, 28), 13,
             NSFontWeightBold, RGB(239, 235, 225, 0.9 * tokenAlpha), 2.6,
             NSTextAlignmentCenter, NO);
  }

  CGFloat endpointAlpha = endpoints * (1 - outro);
  if (endpointAlpha > 0.001) {
    DrawPhotoNode(leftPoints[0].pointValue, assets.electronics, 72,
                  endpointAlpha);
    DrawPhotoNode(leftPoints[1].pointValue, assets.books, 68, endpointAlpha);
    DrawPhotoNode(leftPoints[2].pointValue, assets.clothing, 62, endpointAlpha);
    DrawPersonNode(rightPoints[0].pointValue, @"A", 62, endpointAlpha);
    DrawPersonNode(rightPoints[1].pointValue, @"M", 70, endpointAlpha);
    DrawPersonNode(rightPoints[2].pointValue, @"S", 58, endpointAlpha);

    DrawText(@"ONE VERIFIED WATERLOO EXCHANGE",
             TopRect(196, 790 + worldY, 328, 26), 9.5,
             NSFontWeightSemibold,
             RGB(242, 213, 111, 0.55 * endpointAlpha), 2.4,
             NSTextAlignmentCenter, NO);
  }

  [NSGraphicsContext restoreGraphicsState];

  DrawVignette(1);
}

static CGImageRef CreateFrame(UMMotionScene scene, CGFloat time,
                              UMAssets assets) CF_RETURNS_RETAINED {
  const size_t outputWidth = (size_t)llround(kWidth * kOutputScale);
  const size_t outputHeight = (size_t)llround(kHeight * kOutputScale);
  size_t bytesPerRow = outputWidth * 4;
  void *pixels = calloc(outputHeight, bytesPerRow);
  CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
  CGContextRef context = CGBitmapContextCreate(
      pixels, outputWidth, outputHeight, 8, bytesPerRow, colorSpace,
      kCGImageAlphaPremultipliedFirst | kCGBitmapByteOrder32Little);
  CGColorSpaceRelease(colorSpace);
  CGContextScaleCTM(context, kOutputScale, kOutputScale);

  NSGraphicsContext *graphics =
      [NSGraphicsContext graphicsContextWithCGContext:context flipped:NO];
  [NSGraphicsContext saveGraphicsState];
  [NSGraphicsContext setCurrentContext:graphics];

  switch (scene) {
  case UMMotionSceneAccess:
    DrawAccessScene(time, assets);
    break;
  case UMMotionSceneBrowse:
    DrawBrowseScene(time, assets);
    break;
  case UMMotionSceneNetwork:
    DrawNetworkScene(time, assets);
    break;
  }

  [NSGraphicsContext restoreGraphicsState];
  CGImageRef image = CGBitmapContextCreateImage(context);
  CGContextRelease(context);
  free(pixels);
  return image;
}

static NSData *EncodeImage(CGImageRef image, CFStringRef type,
                           CGFloat quality) {
  NSMutableData *data = [NSMutableData data];
  CGImageDestinationRef destination = CGImageDestinationCreateWithData(
      (__bridge CFMutableDataRef)data, type, 1, NULL);
  NSDictionary *options = @{
    (__bridge NSString *)
    kCGImageDestinationLossyCompressionQuality : @(quality),
  };
  CGImageDestinationAddImage(destination, image,
                             (__bridge CFDictionaryRef)options);
  BOOL success = CGImageDestinationFinalize(destination);
  CFRelease(destination);
  return success ? data : nil;
}

static BOOL RenderScene(UMMotionScene scene, NSString *name,
                        NSString *streamPath, NSString *posterPath,
                        UMAssets assets) {
  [[NSFileManager defaultManager] removeItemAtPath:streamPath error:nil];
  [[NSFileManager defaultManager] createFileAtPath:streamPath
                                          contents:nil
                                        attributes:nil];
  NSFileHandle *handle = [NSFileHandle fileHandleForWritingAtPath:streamPath];
  if (!handle)
    return NO;

  NSInteger frameCount = (NSInteger)(kFPS * kDuration);
  for (NSInteger frame = 0; frame < frameCount; frame++) {
    @autoreleasepool {
      CGFloat normalizedTime = (CGFloat)frame / (CGFloat)MAX(frameCount - 1, 1);
      CGImageRef image = CreateFrame(scene, normalizedTime, assets);
      // Keep the intermediate visually lossless enough that the final WebM
      // encode does not amplify ringing around small UI type and hairlines.
      NSData *jpeg = EncodeImage(image, CFSTR("public.jpeg"), 0.95);
      if (frame == 0 || frame == frameCount - 1) {
        NSString *edgeName = frame == 0 ? @"first" : @"last";
        NSString *edgePath = [[[streamPath stringByDeletingPathExtension]
            stringByAppendingFormat:@"-%@", edgeName]
            stringByAppendingPathExtension:@"png"];
        NSData *edgeFrame = EncodeImage(image, CFSTR("public.png"), 1);
        [edgeFrame writeToFile:edgePath atomically:YES];
      }
      CGImageRelease(image);
      if (!jpeg) {
        [handle closeFile];
        return NO;
      }
      [handle writeData:jpeg];
    }
    if (frame % kFPS == 0) {
      NSLog(@"%@ · %ld / %ld", name, (long)frame, (long)frameCount);
    }
  }
  [handle closeFile];

  CGFloat posterTime = scene == UMMotionSceneAccess
                           ? 0.72
                           : (scene == UMMotionSceneBrowse ? 0.315 : 0.82);
  CGImageRef poster = CreateFrame(scene, posterTime, assets);
  NSData *png = EncodeImage(poster, CFSTR("public.png"), 1);
  CGImageRelease(poster);
  BOOL posterWritten = [png writeToFile:posterPath atomically:YES];

  CGFloat inspectionTime = scene == UMMotionSceneAccess
                               ? 0.35
                               : (scene == UMMotionSceneBrowse ? 0.52 : 0.68);
  CGImageRef inspection = CreateFrame(scene, inspectionTime, assets);
  NSData *inspectionPng = EncodeImage(inspection, CFSTR("public.png"), 1);
  CGImageRelease(inspection);
  NSString *inspectionPath = [[[streamPath stringByDeletingPathExtension]
      stringByAppendingString:@"-inspection"]
      stringByAppendingPathExtension:@"png"];
  BOOL inspectionWritten = [inspectionPng writeToFile:inspectionPath
                                           atomically:YES];
  return posterWritten && inspectionWritten;
}

static NSImage *LoadImage(NSString *root, NSString *relativePath) {
  NSString *path = [root stringByAppendingPathComponent:relativePath];
  NSImage *image = [[NSImage alloc] initWithContentsOfFile:path];
  if (!image)
    NSLog(@"Unable to load %@", path);
  return image;
}

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    NSString *root = [[NSFileManager defaultManager] currentDirectoryPath];
    NSString *temporary = @"/private/tmp/unimarket-motion";
    NSString *output = [root stringByAppendingPathComponent:@"public/motion"];
    [[NSFileManager defaultManager] createDirectoryAtPath:temporary
                              withIntermediateDirectories:YES
                                               attributes:nil
                                                    error:nil];
    [[NSFileManager defaultManager] createDirectoryAtPath:output
                              withIntermediateDirectories:YES
                                               attributes:nil
                                                    error:nil];

    // Keep strong owners alive for the full render. UMAssets intentionally
    // stores non-owning pointers so it can remain a plain C value passed into
    // draw calls.
    NSImage *logo = LoadImage(root, @"public/brand/trovun-mark.png");
    NSImage *badge =
        LoadImage(root, @"public/waterloo/uwaterloo-circle-badge.webp");
    NSImage *electronics = LoadImage(
        root, @"public/waterloo/category-electronics-still-life-v2.webp");
    NSImage *books =
        LoadImage(root, @"public/waterloo/category-books-still-life-v2.webp");
    NSImage *household = LoadImage(
        root, @"public/waterloo/category-household-still-life-v2.webp");
    NSImage *clothing = LoadImage(
        root, @"public/waterloo/category-clothing-still-life-v2.webp");

    UMAssets assets = {
        .logo = logo,
        .badge = badge,
        .electronics = electronics,
        .books = books,
        .household = household,
        .clothing = clothing,
    };

    NSArray<NSDictionary *> *scenes = @[
      @{@"name" : @"access",
        @"scene" : @(UMMotionSceneAccess)},
      @{@"name" : @"browse",
        @"scene" : @(UMMotionSceneBrowse)},
      @{@"name" : @"network",
        @"scene" : @(UMMotionSceneNetwork)},
    ];

    NSString *requestedScene =
        argc > 1 ? [NSString stringWithUTF8String:argv[1]] : nil;
    BOOL renderedScene = NO;
    for (NSDictionary *definition in scenes) {
      NSString *name = definition[@"name"];
      if (requestedScene && ![requestedScene isEqualToString:name])
        continue;

      renderedScene = YES;
      UMMotionScene scene = [definition[@"scene"] integerValue];
      NSString *stream = [temporary
          stringByAppendingPathComponent:[NSString stringWithFormat:@"%@.mjpeg",
                                                                    name]];
      NSString *poster = [output
          stringByAppendingPathComponent:[NSString
                                             stringWithFormat:@"%@-poster.png",
                                                              name]];
      if (!RenderScene(scene, name, stream, poster, assets)) {
        NSLog(@"Failed to render %@", name);
        return 1;
      }
    }

    if (!renderedScene) {
      NSLog(@"Unknown scene '%@'. Use access, browse, or network.",
            requestedScene);
      return 2;
    }

    NSLog(@"Motion frames and posters rendered.");
  }
  return 0;
}
