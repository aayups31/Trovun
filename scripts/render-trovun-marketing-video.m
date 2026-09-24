#import <AppKit/AppKit.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreVideo/CoreVideo.h>
#import <Foundation/Foundation.h>

static const NSInteger W = 1920;
static const NSInteger H = 1080;
static const NSInteger FPS = 30;
static const CGFloat DURATION = 24.0;

typedef struct {
  __unsafe_unretained NSImage *logo;
  __unsafe_unretained NSImage *campus;
  __unsafe_unretained NSImage *electronics;
  __unsafe_unretained NSImage *books;
  __unsafe_unretained NSImage *household;
  __unsafe_unretained NSImage *clothing;
  __unsafe_unretained NSImage *badge;
} Assets;

static CGFloat Clamp(CGFloat v, CGFloat lo, CGFloat hi) { return MIN(MAX(v, lo), hi); }
static CGFloat Phase(CGFloat t, CGFloat a, CGFloat b) { return Clamp((t-a)/(b-a), 0, 1); }
static CGFloat Ease(CGFloat x) { x=Clamp(x,0,1); return x<.5?4*x*x*x:1-pow(-2*x+2,3)/2; }
static CGFloat Out(CGFloat x) { x=Clamp(x,0,1); return 1-pow(1-x,3); }
static CGFloat Back(CGFloat x) { x=Clamp(x,0,1); CGFloat c=1.70158; return 1+(c+1)*pow(x-1,3)+c*pow(x-1,2); }
static CGFloat Mix(CGFloat a, CGFloat b, CGFloat x) { return a+(b-a)*x; }
static NSColor *RGB(CGFloat r, CGFloat g, CGFloat b, CGFloat a) { return [NSColor colorWithSRGBRed:r/255. green:g/255. blue:b/255. alpha:a]; }
static NSRect R(CGFloat x, CGFloat y, CGFloat w, CGFloat h) { return NSMakeRect(x, H-y-h, w, h); }
static NSPoint P(CGFloat x, CGFloat y) { return NSMakePoint(x, H-y); }
static NSFont *Sans(CGFloat size, NSFontWeight weight) {
  NSFont *f=[NSFont fontWithName:@"Helvetica Neue" size:size];
  return f ?: [NSFont systemFontOfSize:size weight:weight];
}
static NSFont *Serif(CGFloat size) {
  NSFont *f=[NSFont fontWithName:@"Iowan Old Style Italic" size:size];
  return f ?: [NSFont fontWithName:@"Georgia Italic" size:size];
}
static NSBezierPath *Round(NSRect r, CGFloat radius) { return [NSBezierPath bezierPathWithRoundedRect:r xRadius:radius yRadius:radius]; }

static void Text(NSString *s, NSRect rect, CGFloat size, NSFontWeight weight,
                 NSColor *color, CGFloat tracking, NSTextAlignment align, BOOL serif) {
  NSMutableParagraphStyle *p=[NSMutableParagraphStyle new];
  p.alignment=align; p.lineBreakMode=NSLineBreakByWordWrapping;
  p.minimumLineHeight=size*1.04; p.maximumLineHeight=size*1.04;
  NSDictionary *a=@{NSFontAttributeName:serif?Serif(size):Sans(size,weight),
                    NSForegroundColorAttributeName:color,
                    NSKernAttributeName:@(tracking), NSParagraphStyleAttributeName:p};
  [s drawInRect:rect withAttributes:a];
}

static void Shadow(NSColor *color, CGFloat blur, CGFloat x, CGFloat y) {
  NSShadow *s=[NSShadow new]; s.shadowColor=color; s.shadowBlurRadius=blur; s.shadowOffset=NSMakeSize(x,y); [s set];
}
static void NoShadow(void) { Shadow([NSColor clearColor],0,0,0); }

static void Panel(NSRect rect, CGFloat radius, CGFloat alpha) {
  [NSGraphicsContext saveGraphicsState];
  CGContextSetAlpha(NSGraphicsContext.currentContext.CGContext, Clamp(alpha,0,1));
  NSBezierPath *p=Round(rect,radius);
  Shadow(RGB(0,0,0,.62),56,0,-28); [RGB(5,10,15,1) setFill]; [p fill]; NoShadow();
  NSGradient *g=[[NSGradient alloc] initWithStartingColor:RGB(24,35,46,1) endingColor:RGB(8,15,22,1)];
  [g drawInBezierPath:p angle:-72];
  [RGB(239,204,104,.22) setStroke]; p.lineWidth=1.4; [p stroke];
  [NSGraphicsContext restoreGraphicsState];
}

static void Cover(NSImage *image, NSRect rect, CGFloat radius, CGFloat alpha) {
  if(!image) return;
  [NSGraphicsContext saveGraphicsState];
  [Round(rect,radius) addClip];
  NSSize z=image.size; CGFloat sa=z.width/MAX(z.height,1), ta=rect.size.width/MAX(rect.size.height,1);
  NSRect src=NSMakeRect(0,0,z.width,z.height);
  if(sa>ta){CGFloat cw=z.height*ta;src.origin.x=(z.width-cw)/2;src.size.width=cw;}
  else {CGFloat ch=z.width/ta;src.origin.y=(z.height-ch)/2;src.size.height=ch;}
  [image drawInRect:rect fromRect:src operation:NSCompositingOperationSourceOver fraction:alpha respectFlipped:NO hints:@{NSImageHintInterpolation:@(NSImageInterpolationHigh)}];
  [NSGraphicsContext restoreGraphicsState];
}

static void Fit(NSImage *image, NSRect rect, CGFloat alpha) {
  if(!image) return;
  NSSize z=image.size; CGFloat scale=MIN(rect.size.width/z.width,rect.size.height/z.height);
  NSRect d=NSMakeRect(NSMidX(rect)-z.width*scale/2,NSMidY(rect)-z.height*scale/2,z.width*scale,z.height*scale);
  [image drawInRect:d fromRect:NSZeroRect operation:NSCompositingOperationSourceOver fraction:alpha respectFlipped:NO hints:@{NSImageHintInterpolation:@(NSImageInterpolationHigh)}];
}

static void Glow(CGFloat x, CGFloat y, CGFloat radius, NSColor *color, CGFloat alpha) {
  NSPoint c=P(x,y); NSGradient *g=[[NSGradient alloc] initWithStartingColor:[color colorWithAlphaComponent:alpha] endingColor:[color colorWithAlphaComponent:0]];
  [g drawFromCenter:c radius:0 toCenter:c radius:radius options:NSGradientDrawsBeforeStartingLocation|NSGradientDrawsAfterEndingLocation];
}

static void Background(CGFloat t) {
  NSGradient *g=[[NSGradient alloc] initWithColors:@[RGB(4,8,13,1),RGB(10,17,25,1),RGB(3,7,11,1)] atLocations:(const CGFloat[]){0,.53,1} colorSpace:NSColorSpace.sRGBColorSpace];
  [g drawInRect:NSMakeRect(0,0,W,H) angle:-28];
  Glow(260+sin(t*.24)*85,170,680,RGB(226,177,48,1),.115);
  Glow(1680+cos(t*.2)*100,850,760,RGB(37,85,145,1),.14);
  [RGB(255,255,255,.018) setFill];
  uint32_t seed=0x31415926;
  for(int i=0;i<330;i++){seed=seed*1664525u+1013904223u;CGFloat x=seed%1920;seed=seed*1664525u+1013904223u;CGFloat y=seed%1080;NSRectFill(R(x,y,1,1));}
}

static CGFloat SceneAlpha(CGFloat t, CGFloat a, CGFloat b) {
  return Ease(Phase(t,a,a+.62))*(1-Ease(Phase(t,b-.62,b)));
}

static void Transform(CGFloat cx, CGFloat cy, CGFloat scale, CGFloat rotation, CGFloat dx, CGFloat dy) {
  NSAffineTransform *tr=[NSAffineTransform transform]; NSPoint c=P(cx,cy);
  [tr translateXBy:c.x+dx yBy:c.y-dy]; [tr rotateByDegrees:rotation]; [tr scaleBy:scale]; [tr translateXBy:-c.x yBy:-c.y]; [tr concat];
}

static NSBezierPath *TOutline(CGFloat cx, CGFloat cy, CGFloat s) {
  NSBezierPath *p=[NSBezierPath bezierPath];
  NSArray<NSValue*> *pts=@[[NSValue valueWithPoint:P(cx-150*s,cy-150*s)], [NSValue valueWithPoint:P(cx+150*s,cy-150*s)], [NSValue valueWithPoint:P(cx+150*s,cy-72*s)], [NSValue valueWithPoint:P(cx+54*s,cy-72*s)], [NSValue valueWithPoint:P(cx+54*s,cy+150*s)], [NSValue valueWithPoint:P(cx-54*s,cy+150*s)], [NSValue valueWithPoint:P(cx-54*s,cy-72*s)], [NSValue valueWithPoint:P(cx-150*s,cy-72*s)]];
  [p moveToPoint:pts[0].pointValue]; for(NSUInteger i=1;i<pts.count;i++) [p lineToPoint:pts[i].pointValue]; [p closePath]; return p;
}

static void LogoWithTrace(Assets a, CGFloat cx, CGFloat cy, CGFloat size, CGFloat progress, CGFloat alpha) {
  Glow(cx,cy,size*1.35,RGB(233,187,55,1),.13*alpha);
  NSRect logo=R(cx-size/2,cy-size/2,size,size); Fit(a.logo,logo,alpha);
  NSBezierPath *p=TOutline(cx,cy,size/340.); CGFloat total=size*5.15;
  CGFloat pattern[2]={MAX(1,total*Clamp(progress,0,1)),total}; [p setLineDash:pattern count:2 phase:0];
  [RGB(242,207,111,.8*alpha) setStroke]; p.lineWidth=2.2; p.lineJoinStyle=NSRoundLineJoinStyle; p.lineCapStyle=NSRoundLineCapStyle; [p stroke];
}

static void SceneIntro(CGFloat t, Assets a, CGFloat alpha) {
  CGFloat enter=Out(Phase(t,0,.95)); CGFloat drift=(1-enter)*44;
  [NSGraphicsContext saveGraphicsState]; CGContextSetAlpha(NSGraphicsContext.currentContext.CGContext,alpha);
  LogoWithTrace(a,960,358,228,Phase(t,.45,2.2),enter);
  Text(@"T R O V U N",R(560,535+drift,800,72),50,NSFontWeightBold,RGB(248,245,237,enter),12,NSTextAlignmentCenter,NO);
  Text(@"The student marketplace, reimagined.",R(510,622+drift,900,52),30,NSFontWeightRegular,RGB(239,204,104,.92*enter),1.2,NSTextAlignmentCenter,NO);
  CGFloat line=Ease(Phase(t,1.15,2.25)); [RGB(239,204,104,.5*enter) setFill]; NSRectFill(R(960-210*line,708,420*line,2));
  Text(@"UNIVERSITY OF WATERLOO",R(610,750,700,30),15,NSFontWeightSemibold,RGB(255,255,255,.45*enter),4.6,NSTextAlignmentCenter,NO);
  [NSGraphicsContext restoreGraphicsState];
}

static void ProductCard(NSImage *img, NSString *title, NSString *price, NSRect rect, CGFloat alpha) {
  Panel(rect,30,alpha); NSRect photo=NSInsetRect(rect,18,18); photo.size.height=rect.size.height*.58; photo.origin.y=NSMaxY(rect)-18-photo.size.height; Cover(img,photo,20,alpha);
  CGFloat topY=H-(rect.origin.y+rect.size.height);
  Text(title,R(rect.origin.x+24,topY+rect.size.height*.66,rect.size.width-48,38),22,NSFontWeightSemibold,RGB(248,245,237,.94*alpha),.1,NSTextAlignmentLeft,NO);
  Text(price,R(rect.origin.x+24,topY+rect.size.height*.81,rect.size.width-48,34),19,NSFontWeightBold,RGB(239,196,70,alpha),.2,NSTextAlignmentLeft,NO);
}

static void SceneMarketplace(CGFloat t, Assets a, CGFloat alpha) {
  CGFloat local=Phase(t,3.55,9.15), enter=Back(Phase(t,3.55,4.65));
  [NSGraphicsContext saveGraphicsState]; CGContextSetAlpha(NSGraphicsContext.currentContext.CGContext,alpha);
  Text(@"Your campus.\nYour marketplace.",R(105,220,650,220),76,NSFontWeightBold,RGB(248,245,237,1),-2,NSTextAlignmentLeft,NO);
  Text(@"Verified Waterloo students.\nUseful things. Nearby.",R(112,488,570,96),28,NSFontWeightRegular,RGB(255,255,255,.58),.1,NSTextAlignmentLeft,NO);
  Text(@"@UWATERLOO.CA VERIFIED",R(112,650,510,34),16,NSFontWeightBold,RGB(239,199,75,.9),3.1,NSTextAlignmentLeft,NO);
  [NSGraphicsContext saveGraphicsState]; Transform(1320,535,Mix(.92,1,enter),Mix(5,-1.2,enter),80*(1-enter),20*(1-enter));
  NSRect app=R(865,95,895,870); Panel(app,46,1);
  Fit(a.logo,R(910,135,58,58),1); Text(@"TROVUN MARKET",R(992,148,360,42),23,NSFontWeightBold,RGB(248,245,237,.9),2.3,NSTextAlignmentLeft,NO);
  NSRect search=R(915,232,795,90); Panel(search,24,1); Text(@"⌕   What are you looking for?",R(952,258,690,40),24,NSFontWeightRegular,RGB(255,255,255,.62),.2,NSTextAlignmentLeft,NO);
  CGFloat floatY=sin(local*M_PI*2)*8;
  ProductCard(a.electronics,@"Study setup",@"$145",R(915,370+floatY,360,238),1);
  ProductCard(a.books,@"Course books",@"$38",R(1310,350-floatY,360,238),1);
  ProductCard(a.household,@"A little warmth",@"$25",R(915,640-floatY,360,238),1);
  ProductCard(a.clothing,@"Next co-op",@"$40",R(1310,620+floatY,360,238),1);
  [NSGraphicsContext restoreGraphicsState]; [NSGraphicsContext restoreGraphicsState];
}

static void SceneDiscovery(CGFloat t, Assets a, CGFloat alpha) {
  CGFloat base=Phase(t,8.55,14.65);
  [NSGraphicsContext saveGraphicsState]; CGContextSetAlpha(NSGraphicsContext.currentContext.CGContext,alpha);
  Text(@"Find the good stuff.",R(120,104,1680,110),82,NSFontWeightBold,RGB(248,245,237,1),-2,NSTextAlignmentCenter,NO);
  Text(@"From the people already around you.",R(250,210,1420,48),29,NSFontWeightRegular,RGB(255,255,255,.56),.2,NSTextAlignmentCenter,NO);
  NSArray *imgs=@[a.electronics,a.books,a.household,a.clothing]; NSArray *titles=@[@"Electronics",@"Books",@"Household",@"Clothing"];
  NSArray *prices=@[@"from $25",@"from $5",@"from $20",@"from $12"];
  for(int i=0;i<4;i++){
    CGFloat e=Back(Phase(base,.08+i*.07,.31+i*.07)); CGFloat x=145+i*420; CGFloat y=350+(i%2?32:0);
    [NSGraphicsContext saveGraphicsState]; Transform(x+180,y+250,Mix(.72,1,e),Mix(i%2?-5:5,0,e),0,80*(1-e));
    ProductCard(imgs[i],titles[i],prices[i],R(x,y,360,470),e);
    [NSGraphicsContext restoreGraphicsState];
  }
  CGFloat pill=Out(Phase(base,.48,.7)); Panel(R(655,876,610,90),45,pill); Text(@"Search Waterloo  →",R(715,902,490,42),24,NSFontWeightSemibold,RGB(248,245,237,pill),.4,NSTextAlignmentCenter,NO);
  [NSGraphicsContext restoreGraphicsState];
}

static void Bubble(NSString *s, NSRect rect, BOOL mine, CGFloat alpha) {
  NSBezierPath *p=Round(rect,26); [(mine?RGB(225,176,45,alpha):RGB(25,38,50,alpha)) setFill]; [p fill];
  CGFloat top=H-(rect.origin.y+rect.size.height); Text(s,R(rect.origin.x+26,top+22,rect.size.width-52,rect.size.height-34),22,NSFontWeightMedium,mine?RGB(10,15,20,alpha):RGB(248,245,237,alpha),.1,NSTextAlignmentLeft,NO);
}

static void SceneTrust(CGFloat t, Assets a, CGFloat alpha) {
  CGFloat l=Phase(t,14.0,19.75); [NSGraphicsContext saveGraphicsState]; CGContextSetAlpha(NSGraphicsContext.currentContext.CGContext,alpha);
  Text(@"Verified. Messaged. Met.",R(120,128,1680,110),79,NSFontWeightBold,RGB(248,245,237,1),-2,NSTextAlignmentCenter,NO);
  Text(@"A safer way to buy and sell around campus.",R(260,236,1400,45),28,NSFontWeightRegular,RGB(255,255,255,.55),.2,NSTextAlignmentCenter,NO);
  CGFloat card=Back(Phase(l,.04,.28)); [NSGraphicsContext saveGraphicsState]; Transform(550,560,Mix(.82,1,card),Mix(-7,-2,card),-35*(1-card),0);
  Panel(R(210,360,680,430),42,card); Fit(a.badge,R(275,425,108,108),card); Text(@"WATERLOO VERIFIED",R(420,425,390,34),17,NSFontWeightBold,RGB(239,199,75,card),3,NSTextAlignmentLeft,NO);
  Text(@"Student to student.",R(275,566,520,58),38,NSFontWeightSemibold,RGB(248,245,237,card),-.4,NSTextAlignmentLeft,NO); Text(@"Your university email is your way in.",R(275,650,520,76),23,NSFontWeightRegular,RGB(255,255,255,.55*card),.1,NSTextAlignmentLeft,NO); [NSGraphicsContext restoreGraphicsState];
  CGFloat chat=Back(Phase(l,.21,.46)); [NSGraphicsContext saveGraphicsState]; Transform(1315,585,Mix(.8,1,chat),Mix(8,2,chat),45*(1-chat),0);
  Panel(R(980,350,720,500),44,chat); Fit(a.logo,R(1040,398,62,62),chat); Text(@"TROVUN MESSAGES",R(1125,410,460,36),18,NSFontWeightBold,RGB(248,245,237,.78*chat),2.8,NSTextAlignmentLeft,NO);
  Bubble(@"Still available?",R(1050,515,305,76),NO,Phase(l,.36,.49)*chat); Bubble(@"Yes — SLC after class?",R(1260,620,355,82),YES,Phase(l,.49,.62)*chat); Bubble(@"Perfect. See you there.",R(1050,732,360,78),NO,Phase(l,.61,.74)*chat); [NSGraphicsContext restoreGraphicsState];
  [NSGraphicsContext restoreGraphicsState];
}

static void SceneCTA(CGFloat t, Assets a, CGFloat alpha) {
  CGFloat l=Phase(t,19.05,24), enter=Out(Phase(l,.02,.24)); [NSGraphicsContext saveGraphicsState]; CGContextSetAlpha(NSGraphicsContext.currentContext.CGContext,alpha);
  LogoWithTrace(a,960,292,210,Phase(l,.04,.62),enter);
  Text(@"Your university. Your people.",R(270,474,1380,86),68,NSFontWeightBold,RGB(248,245,237,enter),-1.6,NSTextAlignmentCenter,NO);
  Text(@"For you.",R(560,558,800,95),68,NSFontWeightRegular,RGB(239,199,75,enter),-.5,NSTextAlignmentCenter,YES);
  Panel(R(662,720,596,92),46,enter); Text(@"JOIN TROVUN   →",R(720,748,480,40),22,NSFontWeightBold,RGB(12,18,24,enter),2,NSTextAlignmentCenter,NO); [RGB(233,187,55,enter) setFill]; [Round(R(662,720,596,92),46) fill]; Text(@"JOIN TROVUN   →",R(720,748,480,40),22,NSFontWeightBold,RGB(10,15,20,enter),2,NSTextAlignmentCenter,NO);
  Text(@"TROVUN.CA   •   VERIFIED WATERLOO STUDENTS",R(450,875,1020,38),16,NSFontWeightSemibold,RGB(255,255,255,.48*enter),3.4,NSTextAlignmentCenter,NO);
  [NSGraphicsContext restoreGraphicsState];
}

static void DrawFrame(CGFloat t, Assets a, CGContextRef cg) {
  NSGraphicsContext *gc=[NSGraphicsContext graphicsContextWithCGContext:cg flipped:NO];
  [NSGraphicsContext saveGraphicsState]; [NSGraphicsContext setCurrentContext:gc]; Background(t);
  CGFloat a1=SceneAlpha(t,0,4.35),a2=SceneAlpha(t,3.72,9.25),a3=SceneAlpha(t,8.62,14.72),a4=SceneAlpha(t,14.08,19.82),a5=Ease(Phase(t,19.12,19.82));
  if(a1>.001) SceneIntro(t,a,a1); if(a2>.001) SceneMarketplace(t,a,a2); if(a3>.001) SceneDiscovery(t,a,a3); if(a4>.001) SceneTrust(t,a,a4); if(a5>.001) SceneCTA(t,a,a5);
  NSGradient *v=[[NSGradient alloc] initWithStartingColor:RGB(0,0,0,0) endingColor:RGB(0,0,0,.48)]; [v drawInRect:R(0,860,W,220) angle:-90];
  [NSGraphicsContext restoreGraphicsState];
}

static NSImage *Load(NSString *root, NSString *path) { return [[NSImage alloc] initWithContentsOfFile:[root stringByAppendingPathComponent:path]]; }

static BOOL RenderVideo(NSString *path, Assets assets) {
  [[NSFileManager defaultManager] removeItemAtPath:path error:nil]; NSError *err=nil;
  AVAssetWriter *writer=[[AVAssetWriter alloc] initWithURL:[NSURL fileURLWithPath:path] fileType:AVFileTypeMPEG4 error:&err]; if(!writer){NSLog(@"writer: %@",err);return NO;}
  NSDictionary *compression=@{AVVideoAverageBitRateKey:@(14000000),AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel,AVVideoMaxKeyFrameIntervalKey:@(FPS*2)};
  NSDictionary *settings=@{AVVideoCodecKey:AVVideoCodecTypeH264,AVVideoWidthKey:@(W),AVVideoHeightKey:@(H),AVVideoCompressionPropertiesKey:compression};
  AVAssetWriterInput *input=[AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo outputSettings:settings]; input.expectsMediaDataInRealTime=NO;
  NSDictionary *attrs=@{(NSString*)kCVPixelBufferPixelFormatTypeKey:@(kCVPixelFormatType_32BGRA),(NSString*)kCVPixelBufferWidthKey:@(W),(NSString*)kCVPixelBufferHeightKey:@(H)};
  AVAssetWriterInputPixelBufferAdaptor *adaptor=[AVAssetWriterInputPixelBufferAdaptor assetWriterInputPixelBufferAdaptorWithAssetWriterInput:input sourcePixelBufferAttributes:attrs]; [writer addInput:input]; [writer startWriting]; [writer startSessionAtSourceTime:kCMTimeZero];
  NSInteger count=(NSInteger)(DURATION*FPS);
  for(NSInteger f=0;f<count;f++){@autoreleasepool{
    while(!input.readyForMoreMediaData) [NSThread sleepForTimeInterval:.002]; CVPixelBufferRef px=NULL; CVPixelBufferPoolCreatePixelBuffer(NULL,adaptor.pixelBufferPool,&px); CVPixelBufferLockBaseAddress(px,0);
    void *base=CVPixelBufferGetBaseAddress(px); size_t row=CVPixelBufferGetBytesPerRow(px); CGColorSpaceRef cs=CGColorSpaceCreateDeviceRGB(); CGContextRef cg=CGBitmapContextCreate(base,W,H,8,row,cs,kCGImageAlphaPremultipliedFirst|kCGBitmapByteOrder32Little); CGColorSpaceRelease(cs);
    DrawFrame((CGFloat)f/FPS,assets,cg); CGContextRelease(cg); CVPixelBufferUnlockBaseAddress(px,0); [adaptor appendPixelBuffer:px withPresentationTime:CMTimeMake(f,FPS)]; CVPixelBufferRelease(px);
    if(f%(FPS*3)==0) NSLog(@"video %ld / %ld",(long)f,(long)count);
  }}
  [input markAsFinished]; dispatch_semaphore_t sem=dispatch_semaphore_create(0); [writer finishWritingWithCompletionHandler:^{dispatch_semaphore_signal(sem);}]; dispatch_semaphore_wait(sem,DISPATCH_TIME_FOREVER);
  if(writer.status!=AVAssetWriterStatusCompleted){NSLog(@"render failed: %@",writer.error);return NO;} return YES;
}

static BOOL WriteSoundtrack(NSString *path) {
  [[NSFileManager defaultManager] removeItemAtPath:path error:nil]; double sr=44100; AVAudioFormat *fmt=[[AVAudioFormat alloc] initStandardFormatWithSampleRate:sr channels:2]; NSError *e=nil; AVAudioFile *file=[[AVAudioFile alloc] initForWriting:[NSURL fileURLWithPath:path] settings:fmt.settings error:&e]; if(!file){NSLog(@"audio: %@",e);return NO;}
  AVAudioFrameCount total=(AVAudioFrameCount)(DURATION*sr),chunk=4096; uint32_t seed=17;
  for(AVAudioFramePosition pos=0;pos<total;pos+=chunk){AVAudioFrameCount n=(AVAudioFrameCount)MIN(chunk,total-pos); AVAudioPCMBuffer *b=[[AVAudioPCMBuffer alloc] initWithPCMFormat:fmt frameCapacity:n]; b.frameLength=n;
    for(AVAudioFrameCount i=0;i<n;i++){double t=(pos+i)/sr, beat=fmod(t,.5), bar=floor(t/2.0); double roots[]={73.416,65.406,58.270,65.406}; double root=roots[((int)bar)%4]; double pad=.06*sin(2*M_PI*root*t)+.035*sin(2*M_PI*root*1.5*t)+.022*sin(2*M_PI*root*2*t); double env=exp(-beat*7.2); double pluck=.055*env*sin(2*M_PI*root*4*t)+.028*env*sin(2*M_PI*root*6*t); double kick=.12*exp(-beat*18)*sin(2*M_PI*(52+70*exp(-beat*22))*t); seed=seed*1664525u+1013904223u; double noise=((seed>>8)/(double)0xFFFFFF)*2-1; double hat=.017*noise*exp(-fmod(t,.25)*42); double transitions=0; double marks[]={3.72,8.62,14.08,19.12}; for(int k=0;k<4;k++){double d=t-marks[k]; if(d>=0&&d<.7) transitions+=.05*sin(2*M_PI*(250+700*d)*d)*exp(-d*5);}
      double fade=MIN(1,t/.8)*MIN(1,(DURATION-t)/1.2); double v=tanh((pad+pluck+kick+hat+transitions)*1.7)*fade; b.floatChannelData[0][i]=(float)(v*.96); b.floatChannelData[1][i]=(float)(v*(.94+.03*sin(t*.7)));
    } if(![file writeFromBuffer:b error:&e]){NSLog(@"audio write: %@",e);return NO;}
  } return YES;
}

static BOOL Combine(NSString *videoPath, NSString *audioPath, NSString *outPath) {
  [[NSFileManager defaultManager] removeItemAtPath:outPath error:nil]; AVURLAsset *v=[AVURLAsset URLAssetWithURL:[NSURL fileURLWithPath:videoPath] options:nil],*a=[AVURLAsset URLAssetWithURL:[NSURL fileURLWithPath:audioPath] options:nil]; AVMutableComposition *c=[AVMutableComposition composition]; NSError *e=nil;
  AVAssetTrack *vt=[v tracksWithMediaType:AVMediaTypeVideo].firstObject,*at=[a tracksWithMediaType:AVMediaTypeAudio].firstObject; if(!vt||!at)return NO;
  AVMutableCompositionTrack *cv=[c addMutableTrackWithMediaType:AVMediaTypeVideo preferredTrackID:kCMPersistentTrackID_Invalid]; [cv insertTimeRange:CMTimeRangeMake(kCMTimeZero,v.duration) ofTrack:vt atTime:kCMTimeZero error:&e]; cv.preferredTransform=vt.preferredTransform;
  AVMutableCompositionTrack *ca=[c addMutableTrackWithMediaType:AVMediaTypeAudio preferredTrackID:kCMPersistentTrackID_Invalid]; [ca insertTimeRange:CMTimeRangeMake(kCMTimeZero,v.duration) ofTrack:at atTime:kCMTimeZero error:&e];
  AVAssetExportSession *x=[[AVAssetExportSession alloc] initWithAsset:c presetName:AVAssetExportPresetHighestQuality]; x.outputURL=[NSURL fileURLWithPath:outPath]; x.outputFileType=AVFileTypeMPEG4; x.shouldOptimizeForNetworkUse=YES; dispatch_semaphore_t sem=dispatch_semaphore_create(0); [x exportAsynchronouslyWithCompletionHandler:^{dispatch_semaphore_signal(sem);}]; dispatch_semaphore_wait(sem,DISPATCH_TIME_FOREVER); if(x.status!=AVAssetExportSessionStatusCompleted){NSLog(@"export: %@",x.error);return NO;} return YES;
}

int main(void){@autoreleasepool{
  NSString *root=NSFileManager.defaultManager.currentDirectoryPath,*dir=[root stringByAppendingPathComponent:@"artifacts/video"]; [NSFileManager.defaultManager createDirectoryAtPath:dir withIntermediateDirectories:YES attributes:nil error:nil];
  NSImage *logo=Load(root,@"public/brand/trovun-logo-no-background.png"),*campus=Load(root,@"public/waterloo/campus-aerial-hero.webp"),*electronics=Load(root,@"public/waterloo/category-electronics-photo-v3-960.webp"),*books=Load(root,@"public/waterloo/category-books-photo-v3-960.webp"),*household=Load(root,@"public/waterloo/category-household-photo-v3-960.webp"),*clothing=Load(root,@"public/waterloo/category-clothing-photo-v3-960.webp"),*badge=Load(root,@"public/waterloo/uwaterloo-circle-badge.webp");
  Assets assets={.logo=logo,.campus=campus,.electronics=electronics,.books=books,.household=household,.clothing=clothing,.badge=badge};
  NSString *silent=[dir stringByAppendingPathComponent:@"trovun-marketing-silent.mp4"],*wav=[dir stringByAppendingPathComponent:@"trovun-marketing-soundtrack.wav"],*final=[dir stringByAppendingPathComponent:@"trovun-marketing-24s.mp4"];
  if(!RenderVideo(silent,assets)||!WriteSoundtrack(wav)||!Combine(silent,wav,final)) return 1; [NSFileManager.defaultManager removeItemAtPath:silent error:nil]; [NSFileManager.defaultManager removeItemAtPath:wav error:nil]; NSLog(@"Rendered %@",final);
}return 0;}
