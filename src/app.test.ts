import request = require("supertest");
import app from "../src/app";

describe("The Main API", () => {
  it("should return a status 200 & a Message", () => {
    return request(app)
      .get("/status")
      .expect(200)
      .expect("Content-Type", /json/)
      .then((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            msg: "API is up and running",
          })
        );
      });
  });
});
