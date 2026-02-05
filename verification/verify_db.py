from playwright.sync_api import sync_playwright
import time

def run():
    print("Starting verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Go to app
            page.goto("http://localhost:5173")

            page.wait_for_selector('body', timeout=10000)
            print(f"Page loaded: {page.title()}")

            print("Injecting localStorage...")
            page.evaluate("localStorage.setItem('onboarding_complete', 'true')")
            page.evaluate("localStorage.setItem('auth_token', 'dummy_token')")

            page.reload()
            time.sleep(3)

            # Handle Pin Setup
            if page.get_by_text("Set Your PIN").is_visible() or page.get_by_text("Create a PIN").is_visible():
                 print("Setting up PIN (typing)...")
                 page.keyboard.type("1234")
                 time.sleep(2) # Wait for async operations
                 print("PIN entered.")

            # Handle Unlock if setup wasn't needed
            elif page.get_by_text("Enter PIN").is_visible():
                  print("Unlocking with PIN (typing)...")
                  page.keyboard.type("1234")
                  time.sleep(2)

            # Check if unlocked (Sidebar should be visible if md, or just check PinLockScreen gone)
            # If "Set Your PIN" is still visible, something failed.
            if page.get_by_text("Set Your PIN").is_visible():
                print("⚠️ PIN Setup screen still visible!")

            print("Injecting heavy conversation into IndexedDB...")
            page.evaluate("""
                new Promise((resolve, reject) => {
                    try {
                        const request = indexedDB.open('IdeaRefineryDB');
                        request.onsuccess = (event) => {
                            const db = event.target.result;
                            if (!db.objectStoreNames.contains('conversations')) {
                                reject('Store conversations not found');
                                return;
                            }
                            const tx = db.transaction(['conversations'], 'readwrite');
                            const store = tx.objectStore('conversations');
                            const req = store.put({
                                idea: 'Heavy Project ' + Date.now(),
                                timestamp: Date.now(),
                                lastUpdated: Date.now(),
                                blueprint: 'Specific Blueprint Content',
                                questions: ['Q1'],
                                htmlMockup: '<h1>LARGE MOCKUP</h1>'.repeat(100),
                                isSummary: false
                            });
                            req.onsuccess = () => resolve();
                            req.onerror = (e) => reject('Put failed: ' + e.target.error);
                        };
                        request.onerror = (e) => reject('Open failed: ' + e.target.error);
                    } catch (e) {
                        reject('Exception: ' + e.message);
                    }
                })
            """)
            print("Injection complete.")

            time.sleep(1)

            # Reload to trigger getRecentConversations
            print("Reloading to fetch history...")

            # Listen for console logs
            msgs = []
            page.on("console", lambda msg: msgs.append(msg.text))

            page.reload()
            time.sleep(5)

            # Handle Unlock again (session unlocked state is lost on reload)
            if page.get_by_text("Enter PIN").is_visible():
                  print("Unlocking with PIN again (typing)...")
                  page.keyboard.type("1234")
                  time.sleep(2)

            # Navigate to History View
            print("Navigating to History...")

            try:
                # Try clicking History text
                page.get_by_text("History", exact=True).click()
            except:
                print("Could not find 'History' text via click, forcing URL or trying deeper")
                # Try finding any element containing History
                page.locator("text=History").first.click()

            # Wait for list item
            print("Waiting for history list...")
            page.wait_for_selector("text=Heavy Project", timeout=10000)

            # Check logs
            found_opt_log = False
            for msg in msgs:
                if "[DB_OPT]" in msg:
                    print(f"FOUND LOG: {msg}")
                    if "stripping from summary" in msg:
                        found_opt_log = True

            if found_opt_log:
                print("✅ VERIFIED: DB Optimization log found (htmlMockup stripped).")
            else:
                print("❌ FAILED: DB Optimization log NOT found.")

            # Verify clicking loads the mockup
            print("Opening project...")
            page.get_by_text("Heavy Project").first.click()

            # Wait for Mockup Stage
            # The item has htmlMockup, so it should load MockupStage
            page.wait_for_selector("text=Design Mockup Preview", timeout=10000)
            print("✅ VERIFIED: Mockup Stage loaded.")

            # Verify iframe
            count = page.locator("iframe").count()
            if count > 0:
                 print(f"✅ VERIFIED: {count} iframe(s) present.")
            else:
                 print("❌ FAILED: No iframe found.")

            page.screenshot(path="verification/db_opt_result.png")
            print("Screenshot saved.")

        except Exception as e:
            print(f"❌ Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
