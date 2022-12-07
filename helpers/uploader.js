import firebase from "firebase/compat";
import { firebaseConfig } from "../middleware/firebaseApp";

const uploadInStorage = (folder, fileName, uploadedFile, withCodecs = 0) =>
  new Promise((resolve, reject) => {
    let img = "";
    let imgType = uploadedFile.slice(
      uploadedFile.indexOf(":") + 1,
      uploadedFile.indexOf(";")
    );

    if (withCodecs == 0) {
      console.log("Uploading image ...");

      img = uploadedFile.slice(uploadedFile.indexOf(",") + 1);
    } else {
      console.log("Uploading video ...");
      let result = uploadedFile.substring(uploadedFile.indexOf(";") + 1);
      let result2 = result.substring(result.indexOf(";") + 1);
      img = result2.slice(result2.indexOf(",") + 1);
      console.log(img);

    }

    const app = firebase.initializeApp(firebaseConfig);

    const uploadTask = app
      .storage()
      .ref(folder)
      .child(fileName)
      .putString(img, "base64", { contentType: imgType });

    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
      },
      (error) => {
        console.log(error);
        // An error occurred so inform the caller
        reject(error);
      },
      async () => {
        const imgURL = await uploadTask.snapshot.ref.getDownloadURL();
        console.log("uploaded image: " + imgURL);

        // We 'awaited' the imgURL, now resolve this Promise
        resolve(imgURL);
      }
    );
  });

export default uploadInStorage;
