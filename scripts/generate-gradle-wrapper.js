const fs = require('fs');
const path = require('path');
const https = require('https');

const androidDir = path.join(__dirname, '..', 'android');
const wrapperDir = path.join(androidDir, 'gradle', 'wrapper');

// Gradle wrapper files content
const gradlewBat = `@rem
@rem Copyright 2015 the original author or authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem you may not use this file except in compliance with the License.
@rem You may obtain a copy of the License at
@rem
@rem      https://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, software
@rem distributed under the License is distributed on an "AS IS" BASIS,
@rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@rem See the License for the specific language governing permissions and
@rem limitations under the License.
@rem

@if "%DEBUG%"=="" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Resolve any "." and ".." in APP_HOME to make it shorter.
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

@rem Add default JVM options here. You can also use JAVA_OPTS and GRADLE_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if %ERRORLEVEL% equ 0 goto execute

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar


@rem Execute Gradle
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*

:end
@rem End local scope for the variables with windows NT shell
if %ERRORLEVEL% equ 0 goto mainEnd

:fail
rem Set variable GRADLE_EXIT_CONSOLE if you need the _script_ return code instead of
rem the _cmd.exe /c_ return code!
set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% equ 0 set EXIT_CODE=1
if not ""=="%GRADLE_EXIT_CONSOLE%" exit %EXIT_CODE%
exit /b %EXIT_CODE%

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
`;

// Gradle wrapper files will be downloaded from official sources

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle redirect
                https.get(response.headers.location, (redirectResponse) => {
                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', reject);
            } else {
                file.close();
                fs.unlinkSync(dest);
                reject(new Error(`Failed to download: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(dest)) {
                fs.unlinkSync(dest);
            }
            reject(err);
        });
    });
}

async function generateWrapper() {
    try {
        // Ensure directories exist
        if (!fs.existsSync(wrapperDir)) {
            fs.mkdirSync(wrapperDir, { recursive: true });
        }

        // Write gradlew.bat
        const gradlewBatPath = path.join(androidDir, 'gradlew.bat');
        if (!fs.existsSync(gradlewBatPath)) {
            fs.writeFileSync(gradlewBatPath, gradlewBat);
            console.log('✓ Created gradlew.bat');
        }

        // Download gradlew (Unix script)
        const gradlewPath = path.join(androidDir, 'gradlew');
        if (!fs.existsSync(gradlewPath)) {
            console.log('Downloading gradlew...');
            await downloadFile(
                'https://raw.githubusercontent.com/gradle/gradle/v8.2.1/gradlew',
                gradlewPath
            );
            // Make executable on Unix systems
            if (process.platform !== 'win32') {
                fs.chmodSync(gradlewPath, '755');
            }
            console.log('✓ Downloaded gradlew');
        }

        // Download gradle-wrapper.jar
        const jarPath = path.join(wrapperDir, 'gradle-wrapper.jar');
        if (!fs.existsSync(jarPath)) {
            console.log('Downloading gradle-wrapper.jar...');
            await downloadFile(
                'https://raw.githubusercontent.com/gradle/gradle/v8.2.1/gradle/wrapper/gradle-wrapper.jar',
                jarPath
            );
            console.log('✓ Downloaded gradle-wrapper.jar');
        }

        console.log('✓ Gradle wrapper generated successfully!');
    } catch (error) {
        console.error('Error generating gradle wrapper:', error.message);
        process.exit(1);
    }
}

generateWrapper();

