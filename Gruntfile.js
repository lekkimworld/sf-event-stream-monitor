module.exports = function(grunt) {
    grunt.initConfig({
        clean: ['public/', "server-dist"],
        copy: {
            main: {
                "files": [
                    {
                        expand: true,
                        cwd: 'dev/images',
                        src: '*.*',
                        dest: 'public/images/'
                    }, 
                    {
                        src: 'dev/manifest.json',
                        dest: 'public/manifest.json'
                    },
                    {
                        "expand": true,
                        "cwd": "src",
                        "src": "**/*.js",
                        "dest": "server-dist"
                    }
                ]
            }
        },
        browserify: {
            'public/js/index.js': ['dev/js/ui/**.js']
        },
        rework: {
            'public/css/styles.css': ['dev/css/**.css'],
            options: {
                vendors: ['-moz-', '-webkit-']
            }
        },
        ts: {
            default : {
                src: ["**/*.ts", "!node_modules/**/*.ts"],
                outDir: "server-dist",
                options: {
                    rootDir: "src"
                }
            }
        },
        watch: {
            scripts: {
                files: ['dev/js/*.js', 'dev/css/*.css', 'src/*.js'],
                tasks: ['default']
              }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-rework');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks("grunt-ts");

    grunt.registerTask('default', ['clean', 'copy', 'browserify', 'rework', 'ts']);
};
