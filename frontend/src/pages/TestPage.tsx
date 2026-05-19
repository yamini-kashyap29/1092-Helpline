import { useState } from "react";

import {
  telephonyAPI,
} from "@/services/api";

function TestPage() {

  const [health, setHealth] =
    useState<any>(null);

  const [response, setResponse] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(false);

  const checkBackend =
    async () => {

      try {

        setLoading(true);

        const res =
          await telephonyAPI.healthCheck();

        console.log(res.data);

        setHealth(res.data);

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);
      }
    };

  const triggerEmergency =
    async () => {

      try {

        setLoading(true);

        const res =
          await telephonyAPI.triggerEmergency(
            "CALL123",
            "CRITICAL"
          );

        console.log(res.data);

        setResponse(res.data);

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);
      }
    };

  return (

    <div
      style={{
        padding: "30px",
        fontFamily: "Arial",
      }}
    >

      <h1>
        1092 AI Emergency Dashboard
      </h1>

      <br />

      <button
        onClick={checkBackend}
        disabled={loading}
      >
        Check Backend
      </button>

      <br />
      <br />

      <button
        onClick={triggerEmergency}
        disabled={loading}
      >
        Trigger Emergency
      </button>

      <br />
      <br />

      <h2>
        Backend Status
      </h2>

      <pre>
        {
          JSON.stringify(
            health,
            null,
            2
          )
        }
      </pre>

      <h2>
        Emergency Response
      </h2>

      <pre>
        {
          JSON.stringify(
            response,
            null,
            2
          )
        }
      </pre>

    </div>
  );
}

export default TestPage;