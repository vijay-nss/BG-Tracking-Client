import { Component, Version } from '@angular/core';
import {
  BackgroundGeolocation,
  BackgroundGeolocationEvents,
  BackgroundGeolocationConfig,
  BackgroundGeolocationResponse,
} from '@ionic-native/background-geolocation/ngx';
import {
  NativeGeocoder,
  NativeGeocoderOptions,
  NativeGeocoderResult,
} from '@ionic-native/native-geocoder/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import { HttpClient } from '@angular/common/http';
import axios from 'axios';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { AppVersion } from '@ionic-native/app-version/ngx';

import { File } from '@ionic-native/file/ngx';
import { FileTransfer, FileTransferObject } from '@ionic-native/file-transfer/ngx';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  lat: number = 0;
  lon: number = 0;
  fullAddress: any = '';

  imageUrl: string = '';
  faceImg: any = '';
  userFaceId: string = '';
  detectedFaceId: string = '';
  appVersion: any = 0;

  constructor(
    public backgroundGeolocation: BackgroundGeolocation,
    private nativeGeocoder: NativeGeocoder,
    private LocationAccuracy: LocationAccuracy,
    private camera: Camera,
    private http: HttpClient,
    public iab: InAppBrowser,
    private appVersionService: AppVersion,
    private file: File,
    private transfer: FileTransfer
  ) {
    setTimeout(() => {
      this.getAppVersion();
    }, 4000);
  }

  StartTracking() {
    console.log('Background geolocation started');

    const config: BackgroundGeolocationConfig = {
      notificationTitle: 'Background tracking',
      notificationText: 'Enabled',
      stopOnTerminate: false,
      startOnBoot: true,
      debug: true,
      desiredAccuracy: 10,
      stationaryRadius: 20,
      distanceFilter: 10,
      interval: 3000,
      fastestInterval: 3000,
    };

    this.backgroundGeolocation
      .configure(config)
      .then(() => {
        this.backgroundGeolocation
          .on(BackgroundGeolocationEvents.location)
          .subscribe((location: BackgroundGeolocationResponse) => {
            console.log(
              `Background geolocation: Latitude ${location.latitude}, Longitude ${location.longitude}`
            );
            this.lat = location.latitude;
            this.lon = location.longitude;
            this.getAddress(this.lat, this.lon);
            this.backgroundGeolocation.configure({
              notificationText: `lat ${this.lat}, lon ${this.lon}`,
            });
          });
        this.backgroundGeolocation.start();
      })
      .catch((error) => {
        console.log('Background geolocation error:', error);
      });
  }

  stopTracking() {
    this.backgroundGeolocation.stop();
  }

  askToTurnOnGPS() {
    this.LocationAccuracy.request(
      this.LocationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY
    ).then(
      () => {
        this.StartTracking();
      },
      (error: any) => {
        console.log('Location Error in asktoTurnOnGps ;' + error);
      }
    );
  }

  getAddress(lat: any, lon: any) {
    let options: NativeGeocoderOptions = { useLocale: true, maxResults: 1 };
    this.nativeGeocoder
      .reverseGeocode(lat, lon, options)
      .then(async (res: NativeGeocoderResult[] | any) => {
        console.log(res);
        this.fullAddress = res[0].addressLines[0];
        let data = {
          lat: lat,
          lon: lon,
          address: this.fullAddress,
        };
        await axios
          .post('https://01b1-103-160-241-118.ngrok-free.app/api/latlon', data)
          .then((res) => {
            console.log(res);
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((error: any) => {
        console.log(error);
      });
  }

  async getAppVersion() {
    try {
      this.appVersion = await this.appVersionService.getVersionNumber();
      console.log('App Version:', this.appVersion);
      let post = {
        Version: this.appVersion,
      };
      axios
        .post('https://01b1-103-160-241-118.ngrok-free.app/api/version', post)
        .then((res: any) => {
          console.log(res);
          if (res.data == false) {
            this._doUpdate();
          } else {
            alert('No new version available');
          }
        })
        .catch((err) => {
          alert(err);
          console.log(err);
        });
    } catch (error) {
      alert('Error getting app version' + error);
      console.error('Error getting app version', error);
    }
  }

  _doUpdate() {
    axios
      .get('https://api.github.com/repos/vijay-nss/APK-Bundle/releases/latest')
      .then((response: any) => {
        console.log(response);
        const data = response.data;
        console.log(data);
        this.promptForUpdate(data?.[0]?.assets[0]?.browser_download_url);
      })
      .catch((error) => {
        console.error('Error fetching GitHub release:', error);
      });
  }

  promptForUpdate(downloadUrl: string) {
    if (confirm('A new version is available. Do you want to update?')) {
      this.downloadAndUpdate(downloadUrl);
    }
  }

  downloadAndUpdate(url: any) {
    console.log('Download started!');

    const fileName = 'Background.apk';
    const filePath = this.file.externalDataDirectory + fileName;
    const transfer: FileTransferObject = this.transfer.create();
    transfer
      .download(url, filePath)
      .then((entry: any) => {
        console.log('Download complete: ' + entry.toURL());
        this.iab.create(entry.toURL(), '_system');
      })
      .catch((error: any) => {
        console.error('Download error: ', error);
      });
  }

  // face register / detect

  // Capture and register the face
  captureAndRegisterFace() {
    const options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      correctOrientation: true,
      saveToPhotoAlbum: false,
      cameraDirection: this.camera.Direction.FRONT, // Use front camera for face capture
    };

    this.camera
      .getPicture(options)
      .then((imageData: any) => {
        this.imageUrl = imageData;
        alert(this.imageUrl);
        this.detectFaceAndRegister(this.imageUrl);
      })
      .catch((error) => {
        alert('Error capturing face:' + error);
        console.error('Error capturing face:', error);
      });
  }

  detectFaceAndRegister(imageUrl: string) {
    this.detectFaceWithGoogleVision(imageUrl)
      .then((faces: any) => {
        if (faces && faces.length > 0) {
          this.faceImg = faces[0];
          alert('face detected' + this.faceImg);
          this.registerFace(this.faceImg);
        } else {
          console.log('No face detected');
          alert('No face detected');
        }
      })
      .catch((error: any) => {
        alert('Error detecting face:' + error.error);
        console.log('Error detecting face:', error.error);
      });
  }

  registerFace(faceData: any) {
    this.userFaceId = `user_${new Date().getTime()}`;
    const storedFaces = JSON.parse(localStorage.getItem('faces') || '[]');
    storedFaces.push({
      userFaceId: this.userFaceId,
      faceData: faceData,
      imageUrl: this.imageUrl,
    });
    localStorage.setItem('faces', JSON.stringify(storedFaces));
    console.log('Face registered successfully!');
    alert('Face registered successfully!');
  }

  detectFaceWithGoogleVision(imageUrl: string) {
    const apiUrl =
      'https://vision.googleapis.com/v1/images:annotate?key=AIzaSyCYfw0y4smtcA0JpCpmLGQwWBgOcFyfNto';

    const base64Image = imageUrl.split('base64,')[1];

    const body = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'FACE_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    };

    return this.http
      .post(apiUrl, body)
      .toPromise()
      .then((response: any) => {
        if (response.responses && response.responses[0].faceAnnotations) {
          return response.responses[0].faceAnnotations;
        } else {
          throw new Error('No face annotations found');
        }
      })
      .catch((error) => {
        console.log('Error during face detection:', error);
        throw error;
      });
  }

  // Silent face capture and verification
  silentCaptureAndVerify() {
    this.captureFaceSilently().then((capturedImage) => {
      alert('captureFaceSilently successfull Response' + capturedImage);
      this.detectFaceAndCompare(capturedImage);
    });
  }

  // Capture face without showing camera UI (silent capture)
  async captureFaceSilently() {
    const options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      correctOrientation: true,
      saveToPhotoAlbum: false,
      cameraDirection: this.camera.Direction.FRONT,
      allowEdit: false, // Ensure no edit UI
      targetWidth: 400, // Set width and height for better resolution
      targetHeight: 400,
    };

    const imageData = await this.camera.getPicture(options);
    alert('captureFaceSilently successfully!');
    return imageData;
  }

  // Compare the newly captured face with the stored faces in localStorage
  detectFaceAndCompare(imageUrl: string) {
    this.detectFaceWithGoogleVision(imageUrl)
      .then((faces: any) => {
        if (faces && faces.length > 0) {
          const detectedFace = faces[0];
          alert('detectFaceWithGoogleVision' + detectedFace);
          this.compareFaceWithDatabase(detectedFace);
        } else {
          alert('No face detected for comparison');
          console.log('No face detected for comparison');
        }
      })
      .catch((error) => {
        alert('Error during face detection comparison:' + error.error);
        console.log('Error during face detection comparison:', error.error);
      });
  }

  // Compare the detected face with faces stored in localStorage
  compareFaceWithDatabase(detectedFace: any) {
    const storedFaces = JSON.parse(localStorage.getItem('faces') || '[]');
    let matched = false;
    for (const face of storedFaces) {
      const registeredFace = face.faceData;
      if (this.isFacesSimilar(detectedFace, registeredFace)) {
        matched = true;
        this.detectedFaceId = face.userFaceId;
        break;
      }
    }

    if (matched) {
      console.log(`Face verified successfully with ID: ${this.detectedFaceId}`);
      alert(`Face verified successfully with ID: ${this.detectedFaceId}`);
    } else {
      console.log('Face verification failed');
      alert(`Face verification failed`);
    }
  }

  // Simplified logic for face comparison
  isFacesSimilar(detectedFace: any, registeredFace: any): boolean {
    return detectedFace.faceDescriptor === registeredFace.faceDescriptor; // Simple comparison logic (use more complex logic if needed)
  }

}
