self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);
      if (existingClient) {
        return existingClient.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/android");
      }
      return undefined;
    })
  );
});
