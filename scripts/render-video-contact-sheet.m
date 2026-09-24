#import <AppKit/AppKit.h>
#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>
#import <ImageIO/ImageIO.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    if (argc != 3) return 2;
    NSString *input = [NSString stringWithUTF8String:argv[1]];
    NSString *output = [NSString stringWithUTF8String:argv[2]];
    AVURLAsset *asset = [AVURLAsset URLAssetWithURL:[NSURL fileURLWithPath:input] options:nil];
    AVAssetImageGenerator *generator = [[AVAssetImageGenerator alloc] initWithAsset:asset];
    generator.appliesPreferredTrackTransform = YES;
    generator.requestedTimeToleranceBefore = CMTimeMakeWithSeconds(0.04, 600);
    generator.requestedTimeToleranceAfter = CMTimeMakeWithSeconds(0.04, 600);

    const size_t width = 1920, height = 1080;
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(NULL, width, height, 8, width * 4,
                                                  colorSpace,
                                                  kCGImageAlphaPremultipliedLast);
    CGColorSpaceRelease(colorSpace);
    CGContextSetRGBFillColor(context, 0.04, 0.05, 0.07, 1);
    CGContextFillRect(context, CGRectMake(0, 0, width, height));

    NSArray<NSNumber *> *seconds = @[@1.0, @4.4, @7.3, @10.0, @12.9, @15.8,
                                      @18.3, @21.0, @23.2];
    for (NSInteger index = 0; index < seconds.count; index++) {
      NSError *error = nil;
      CMTime requested = CMTimeMakeWithSeconds(seconds[index].doubleValue, 600);
      CGImageRef image = [generator copyCGImageAtTime:requested actualTime:NULL error:&error];
      if (!image) { NSLog(@"frame %@: %@", seconds[index], error); continue; }
      NSInteger col = index % 3, row = index / 3;
      CGRect cell = CGRectMake(col * 640, (2 - row) * 360, 640, 360);
      CGContextDrawImage(context, cell, image);
      CGImageRelease(image);

      NSGraphicsContext *graphics = [NSGraphicsContext graphicsContextWithCGContext:context flipped:NO];
      [NSGraphicsContext saveGraphicsState];
      [NSGraphicsContext setCurrentContext:graphics];
      NSString *label = [NSString stringWithFormat:@"%.1fs", seconds[index].doubleValue];
      NSDictionary *attrs = @{NSFontAttributeName:[NSFont boldSystemFontOfSize:18],
                              NSForegroundColorAttributeName:NSColor.whiteColor,
                              NSBackgroundColorAttributeName:[NSColor colorWithWhite:0 alpha:.66]};
      [label drawAtPoint:NSMakePoint(cell.origin.x + 14, cell.origin.y + 14)
          withAttributes:attrs];
      [NSGraphicsContext restoreGraphicsState];
    }

    CGImageRef sheet = CGBitmapContextCreateImage(context);
    CGContextRelease(context);
    NSMutableData *data = [NSMutableData data];
    CGImageDestinationRef destination = CGImageDestinationCreateWithData(
        (__bridge CFMutableDataRef)data, (__bridge CFStringRef)UTTypePNG.identifier, 1, NULL);
    CGImageDestinationAddImage(destination, sheet, NULL);
    BOOL ok = CGImageDestinationFinalize(destination);
    CFRelease(destination);
    CGImageRelease(sheet);
    if (!ok || ![data writeToFile:output atomically:YES]) return 1;
  }
  return 0;
}
